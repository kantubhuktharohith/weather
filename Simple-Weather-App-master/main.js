/* =============================================
   WeatherNow – Real API Integration
   Uses OpenWeatherMap API (free tier):
   - Current Weather: /weather
   - 5-Day Forecast:  /forecast
   - Geocoding:       /geo/1.0/direct
   =============================================

   ⚠️  REPLACE THE API KEY BELOW:
   1. Go to https://openweathermap.org/api
   2. Sign up for free → My API Keys
   3. Paste your key below
   ============================================= */

const API_KEY = '8240002d5bfe4d9e1151903fff380095'; // ← Replace this!

const BASE_URL  = 'https://api.openweathermap.org/data/2.5';
const GEO_URL   = 'https://api.openweathermap.org/geo/1.0';
const ICON_URL  = 'https://openweathermap.org/img/wn';

// ─── State ───────────────────────────────────────
let currentUnit  = 'C';   // 'C' or 'F'
let currentData  = null;  // raw API response (metric)
let forecastData = null;  // raw forecast data

// ─── DOM References ──────────────────────────────
const searchInput    = document.getElementById('searchInput');
const clearBtn       = document.getElementById('clearBtn');
const locationBtn    = document.getElementById('locationBtn');
const suggestions    = document.getElementById('suggestions');
const loadingScreen  = document.getElementById('loadingScreen');
const errorScreen    = document.getElementById('errorScreen');
const weatherContent = document.getElementById('weatherContent');
const apiNotice      = document.getElementById('apiNotice');
const retryBtn       = document.getElementById('retryBtn');
const celsiusBtn     = document.getElementById('celsiusBtn');
const fahrenheitBtn  = document.getElementById('fahrenheitBtn');
const particles      = document.getElementById('particles');

// ─── Init ────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Validate API key
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
    showApiNotice();
    showError('No API Key', 'Please add your OpenWeatherMap API key in main.js to load live weather data.');
    return;
  }

  // Try to load last searched city from localStorage
  const lastCity = localStorage.getItem('wn_last_city');
  if (lastCity) {
    fetchWeather(lastCity);
  } else {
    // Default: use geolocation or show a default city
    tryGeolocation();
  }
});

// ─── Search Logic ────────────────────────────────
let debounceTimer = null;

searchInput.addEventListener('input', (e) => {
  const val = e.target.value.trim();
  clearBtn.style.display = val ? 'block' : 'none';

  clearTimeout(debounceTimer);
  if (val.length >= 2) {
    debounceTimer = setTimeout(() => fetchSuggestions(val), 350);
  } else {
    hideSuggestions();
  }
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const val = searchInput.value.trim();
    if (val) {
      hideSuggestions();
      fetchWeather(val);
    }
  }
  if (e.key === 'Escape') {
    hideSuggestions();
  }
});

clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  clearBtn.style.display = 'none';
  hideSuggestions();
  searchInput.focus();
});

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrapper') && !e.target.closest('.suggestions')) {
    hideSuggestions();
  }
});

// ─── Geolocation ─────────────────────────────────
locationBtn.addEventListener('click', tryGeolocation);

function tryGeolocation() {
  if (!navigator.geolocation) {
    fetchWeather('London'); // Fallback
    return;
  }

  locationBtn.style.opacity = '0.5';
  locationBtn.style.pointerEvents = 'none';
  showLoading();

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      fetchWeatherByCoords(lat, lon);
      locationBtn.style.opacity = '';
      locationBtn.style.pointerEvents = '';
    },
    () => {
      locationBtn.style.opacity = '';
      locationBtn.style.pointerEvents = '';
      fetchWeather('London'); // Fallback
    },
    { timeout: 8000 }
  );
}

// ─── Autocomplete Suggestions ────────────────────
async function fetchSuggestions(query) {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') return;

  try {
    const url = `${GEO_URL}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`;
    const res  = await fetch(url);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      hideSuggestions();
      return;
    }

    showSuggestions(data);
  } catch (_) {
    hideSuggestions();
  }
}

function showSuggestions(cities) {
  suggestions.innerHTML = '';

  cities.forEach(city => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.innerHTML = `
      <span class="sug-icon">📍</span>
      <span>${city.name}${city.state ? ', ' + city.state : ''}</span>
      <span class="sug-country">${city.country}</span>
    `;
    item.addEventListener('click', () => {
      searchInput.value = city.name;
      clearBtn.style.display = 'block';
      hideSuggestions();
      fetchWeatherByCoords(city.lat, city.lon);
    });
    suggestions.appendChild(item);
  });

  suggestions.classList.add('visible');
}

function hideSuggestions() {
  suggestions.classList.remove('visible');
  suggestions.innerHTML = '';
}

// ─── API Calls ───────────────────────────────────
async function fetchWeather(city) {
  showLoading();
  hideSuggestions();

  try {
    const weatherUrl  = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
    const forecastUrl = `${BASE_URL}/forecast?q=${encodeURIComponent(city)}&units=metric&cnt=40&appid=${API_KEY}`;

    const [weatherRes, forecastRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(forecastUrl)
    ]);

    if (!weatherRes.ok) {
      const err = await weatherRes.json();
      handleApiError(weatherRes.status, err.message);
      return;
    }

    const weather  = await weatherRes.json();
    const forecast = await forecastRes.json();

    currentData  = weather;
    forecastData = forecast;

    localStorage.setItem('wn_last_city', city);
    displayWeather(weather, forecast);

  } catch (err) {
    showError('Connection Error', 'Unable to fetch weather data. Check your internet connection.');
  }
}

async function fetchWeatherByCoords(lat, lon) {
  showLoading();
  hideSuggestions();

  try {
    const weatherUrl  = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    const forecastUrl = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&cnt=40&appid=${API_KEY}`;

    const [weatherRes, forecastRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(forecastUrl)
    ]);

    if (!weatherRes.ok) {
      const err = await weatherRes.json();
      handleApiError(weatherRes.status, err.message);
      return;
    }

    const weather  = await weatherRes.json();
    const forecast = await forecastRes.json();

    currentData  = weather;
    forecastData = forecast;

    localStorage.setItem('wn_last_city', weather.name);
    displayWeather(weather, forecast);

  } catch (err) {
    showError('Connection Error', 'Unable to fetch weather data. Check your internet connection.');
  }
}

// ─── Display Logic ───────────────────────────────
function displayWeather(weather, forecast) {
  // City & date
  document.getElementById('cityName').textContent    = weather.name;
  document.getElementById('countryDate').textContent =
    `${weather.sys.country} · ${formatDate(new Date())}`;

  // Temperature (always stored in C, displayed based on unit)
  updateTemperatureDisplay(weather.main.temp, weather.main.temp_min, weather.main.temp_max, weather.main.feels_like);

  // Weather condition
  const condition = weather.weather[0].main;
  const desc      = weather.weather[0].description;
  document.getElementById('weatherDescription').textContent = desc;
  document.getElementById('weatherIconLarge').textContent   = getWeatherEmoji(condition, weather.weather[0].id);

  // Stats
  document.getElementById('statHumidityVal').textContent  = `${weather.main.humidity}%`;
  document.getElementById('statWindVal').textContent       = `${Math.round(weather.wind.speed * 3.6)} km/h`;
  document.getElementById('statVisibilityVal').textContent = weather.visibility
    ? `${(weather.visibility / 1000).toFixed(1)} km`
    : 'N/A';
  document.getElementById('statPressureVal').textContent   = `${weather.main.pressure} hPa`;
  document.getElementById('statSunriseVal').textContent    = formatTime(weather.sys.sunrise, weather.timezone);
  document.getElementById('statSunsetVal').textContent     = formatTime(weather.sys.sunset, weather.timezone);

  // Background
  applyWeatherTheme(condition, weather.sys.sunrise, weather.sys.sunset, weather.timezone);

  // Forecast
  renderForecast(forecast.list);
  renderHourly(forecast.list);

  // Show content
  showContent();
}

function updateTemperatureDisplay(tempC, minC, maxC, feelsC) {
  const tempDisplay    = currentUnit === 'C' ? Math.round(tempC)    : toF(tempC);
  const minDisplay     = currentUnit === 'C' ? Math.round(minC)     : toF(minC);
  const maxDisplay     = currentUnit === 'C' ? Math.round(maxC)     : toF(maxC);
  const feelsDisplay   = currentUnit === 'C' ? Math.round(feelsC)   : toF(feelsC);
  const unit           = currentUnit === 'C' ? '°C' : '°F';

  document.getElementById('tempValue').textContent = tempDisplay;
  document.getElementById('tempHigh').textContent  = `${maxDisplay}${unit}`;
  document.getElementById('tempLow').textContent   = `${minDisplay}${unit}`;
  document.getElementById('feelsLike').textContent = `Feels like ${feelsDisplay}${unit}`;
}

// ─── Forecast Rendering ──────────────────────────
function renderForecast(list) {
  // Get one entry per unique day (skip today)
  const days = {};
  const today = new Date().toDateString();

  list.forEach(item => {
    const d = new Date(item.dt * 1000);
    const key = d.toDateString();
    if (key === today) return;
    if (!days[key]) days[key] = [];
    days[key].push(item);
  });

  const strip = document.getElementById('forecastStrip');
  strip.innerHTML = '';

  Object.entries(days).slice(0, 5).forEach(([dateStr, items]) => {
    const d       = new Date(dateStr);
    const dayName = d.toLocaleDateString('en', { weekday: 'short' });
    const highs   = items.map(i => i.main.temp_max);
    const lows    = items.map(i => i.main.temp_min);
    const high    = Math.max(...highs);
    const low     = Math.min(...lows);
    const mainItem = items[Math.floor(items.length / 2)];
    const condition = mainItem.weather[0].main;
    const emoji   = getWeatherEmoji(condition, mainItem.weather[0].id);
    const unit    = currentUnit === 'C' ? '°C' : '°F';

    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `
      <div class="forecast-day">${dayName}</div>
      <span class="forecast-icon">${emoji}</span>
      <div class="forecast-high">${currentUnit === 'C' ? Math.round(high) : toF(high)}${unit}</div>
      <div class="forecast-low">${currentUnit === 'C' ? Math.round(low) : toF(low)}${unit}</div>
    `;
    strip.appendChild(card);
  });
}

function renderHourly(list) {
  const strip = document.getElementById('hourlyStrip');
  strip.innerHTML = '';

  const now = new Date();

  // Take first 12 entries (covers next ~36 hours at 3h intervals)
  list.slice(0, 12).forEach((item, idx) => {
    const d       = new Date(item.dt * 1000);
    const isNow   = idx === 0;
    const emoji   = getWeatherEmoji(item.weather[0].main, item.weather[0].id);
    const temp    = currentUnit === 'C' ? Math.round(item.main.temp) : toF(item.main.temp);
    const unit    = currentUnit === 'C' ? '°C' : '°F';

    const el = document.createElement('div');
    el.className = `hourly-item${isNow ? ' current-hour' : ''}`;
    el.innerHTML = `
      <div class="hourly-time">${isNow ? 'Now' : formatHour(d)}</div>
      <span class="hourly-icon">${emoji}</span>
      <div class="hourly-temp">${temp}${unit}</div>
    `;
    strip.appendChild(el);
  });
}

// ─── Unit Toggle ─────────────────────────────────
celsiusBtn.addEventListener('click', () => {
  if (currentUnit === 'C') return;
  currentUnit = 'C';
  celsiusBtn.classList.add('active');
  fahrenheitBtn.classList.remove('active');
  if (currentData) {
    const m = currentData.main;
    updateTemperatureDisplay(m.temp, m.temp_min, m.temp_max, m.feels_like);
    if (forecastData) {
      renderForecast(forecastData.list);
      renderHourly(forecastData.list);
    }
  }
});

fahrenheitBtn.addEventListener('click', () => {
  if (currentUnit === 'F') return;
  currentUnit = 'F';
  fahrenheitBtn.classList.add('active');
  celsiusBtn.classList.remove('active');
  if (currentData) {
    const m = currentData.main;
    updateTemperatureDisplay(m.temp, m.temp_min, m.temp_max, m.feels_like);
    if (forecastData) {
      renderForecast(forecastData.list);
      renderHourly(forecastData.list);
    }
  }
});

// ─── Retry Button ────────────────────────────────
retryBtn.addEventListener('click', () => {
  const val = searchInput.value.trim();
  if (val) fetchWeather(val);
  else tryGeolocation();
});

// ─── Weather Theming ─────────────────────────────
function applyWeatherTheme(condition, sunriseUnix, sunsetUnix, timezoneOffset) {
  const condLower = condition.toLowerCase();
  const now       = Date.now() / 1000;
  const localNow  = now + timezoneOffset - (new Date().getTimezoneOffset() * 60);
  const isNight   = localNow < sunriseUnix || localNow > sunsetUnix;

  // Remove all weather classes
  document.body.className = '';

  if (isNight) {
    document.body.classList.add('weather-night');
  } else if (condLower.includes('thunder') || condLower.includes('storm')) {
    document.body.classList.add('weather-storm');
  } else if (condLower.includes('rain') || condLower.includes('drizzle')) {
    document.body.classList.add('weather-rain');
  } else if (condLower.includes('snow')) {
    document.body.classList.add('weather-snow');
  } else if (condLower.includes('mist') || condLower.includes('fog') || condLower.includes('haze') || condLower.includes('smoke')) {
    document.body.classList.add('weather-mist');
  } else if (condLower.includes('cloud')) {
    document.body.classList.add('weather-clouds');
  } else if (condLower.includes('clear')) {
    document.body.classList.add('weather-clear');
  } else {
    document.body.classList.add('weather-default');
  }

  // Launch weather particles
  launchParticles(condLower, isNight);
}

// ─── Particles ───────────────────────────────────
function launchParticles(condition, isNight) {
  particles.innerHTML = '';

  if (condition.includes('rain') || condition.includes('drizzle')) {
    createRain();
  } else if (condition.includes('snow')) {
    createSnow();
  } else {
    createFloatingOrbs(isNight);
  }
}

function createRain() {
  for (let i = 0; i < 80; i++) {
    const drop = document.createElement('div');
    drop.className = 'raindrop';
    drop.style.cssText = `
      left: ${Math.random() * 100}%;
      height: ${15 + Math.random() * 30}px;
      animation-duration: ${0.5 + Math.random() * 0.5}s;
      animation-delay: ${Math.random() * 2}s;
      opacity: ${0.4 + Math.random() * 0.4};
    `;
    particles.appendChild(drop);
  }
}

function createSnow() {
  const flakes = ['❄', '❅', '❆'];
  for (let i = 0; i < 40; i++) {
    const flake = document.createElement('div');
    flake.className = 'snowflake';
    flake.textContent = flakes[Math.floor(Math.random() * flakes.length)];
    flake.style.cssText = `
      left: ${Math.random() * 100}%;
      font-size: ${8 + Math.random() * 14}px;
      animation-duration: ${4 + Math.random() * 6}s;
      animation-delay: ${Math.random() * 5}s;
    `;
    particles.appendChild(flake);
  }
}

function createFloatingOrbs(isNight) {
  for (let i = 0; i < 12; i++) {
    const orb = document.createElement('div');
    orb.className = 'particle';
    const size = 20 + Math.random() * 60;
    orb.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${size}px;
      height: ${size}px;
      animation-duration: ${10 + Math.random() * 20}s;
      animation-delay: ${Math.random() * 15}s;
      background: rgba(255,255,255,${isNight ? 0.06 : 0.1});
    `;
    particles.appendChild(orb);
  }
}

// ─── Weather Emoji Map ───────────────────────────
function getWeatherEmoji(condition, id) {
  // OWM condition IDs: https://openweathermap.org/weather-conditions
  if (id >= 200 && id < 300) return '⛈';
  if (id >= 300 && id < 400) return '🌦';
  if (id === 500)             return '🌧';
  if (id === 501)             return '🌧';
  if (id >= 502 && id < 510) return '🌊';
  if (id >= 510 && id < 520) return '🌧';
  if (id >= 520 && id < 600) return '🌦';
  if (id >= 600 && id < 620) return '🌨';
  if (id >= 620 && id < 700) return '❄️';
  if (id === 701 || id === 741) return '🌫';
  if (id >= 700 && id < 800) return '🌁';
  if (id === 800)             return '☀️';
  if (id === 801)             return '🌤';
  if (id === 802)             return '⛅';
  if (id === 803 || id === 804) return '☁️';
  return '🌡';
}

// ─── Helpers ─────────────────────────────────────
function toF(celsius) {
  return Math.round(celsius * 9 / 5 + 32);
}

function formatDate(d) {
  return d.toLocaleDateString('en', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function formatTime(unixTs, timezoneOffset) {
  // OWM gives timezone as seconds offset from UTC
  const utc = unixTs + timezoneOffset;
  const d   = new Date(utc * 1000);
  // Use UTC methods to get the local time for that location
  const h   = String(d.getUTCHours()).padStart(2, '0');
  const m   = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatHour(d) {
  return d.toLocaleTimeString('en', { hour: 'numeric', hour12: true });
}

// ─── UI State Managers ───────────────────────────
function showLoading() {
  loadingScreen.style.display  = 'flex';
  errorScreen.style.display    = 'none';
  weatherContent.style.display = 'none';
}

function showContent() {
  loadingScreen.style.display  = 'none';
  errorScreen.style.display    = 'none';
  weatherContent.style.display = 'block';
}

function showError(title, message) {
  loadingScreen.style.display  = 'none';
  errorScreen.style.display    = 'flex';
  weatherContent.style.display = 'none';
  document.getElementById('errorTitle').textContent   = title;
  document.getElementById('errorMessage').textContent = message;
}

function showApiNotice() {
  apiNotice.style.display = 'flex';
}

function handleApiError(status, message) {
  if (status === 401) {
    showApiNotice();
    showError('Invalid API Key', 'Your OpenWeatherMap API key is invalid or expired. Please check main.js.');
  } else if (status === 404) {
    showError('City Not Found', `"${searchInput.value}" was not found. Try a different city name.`);
  } else if (status === 429) {
    showError('Too Many Requests', 'API rate limit reached. Please wait a moment and try again.');
  } else {
    showError('API Error', message || 'Something went wrong. Please try again.');
  }
}