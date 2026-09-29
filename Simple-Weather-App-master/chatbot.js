/* =============================================
   WeatherBot – Intelligent Chat Assistant
   Provides instructions, weather tips, and
   guidance to users of the WeatherNow app.
   ============================================= */

(function () {
  'use strict';

  // ─── DOM References ──────────────────────────────
  const fab        = document.getElementById('chatbotFab');
  const fabIcon    = document.getElementById('fabIcon');
  const panel      = document.getElementById('chatbotPanel');
  const closeBtn   = document.getElementById('chatbotClose');
  const messagesEl = document.getElementById('chatbotMessages');
  const chipsEl    = document.getElementById('chatbotChips');
  const input      = document.getElementById('chatbotInput');
  const sendBtn    = document.getElementById('chatbotSend');

  let isOpen   = false;
  let hasGreeted = false;

  // ─── Toggle Panel ────────────────────────────────
  fab.addEventListener('click', () => {
    if (isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  });

  closeBtn.addEventListener('click', closePanel);

  function openPanel() {
    isOpen = true;
    fab.classList.add('open');
    fabIcon.textContent = '✕';
    panel.classList.remove('closing');
    panel.classList.add('visible');

    if (!hasGreeted) {
      hasGreeted = true;
      setTimeout(() => {
        addBotMessage(getGreeting());
        showChips(getInitialChips());
      }, 400);
    }

    setTimeout(() => input.focus(), 400);
  }

  function closePanel() {
    isOpen = false;
    fab.classList.remove('open');
    fabIcon.textContent = '💬';
    panel.classList.add('closing');
    setTimeout(() => {
      panel.classList.remove('visible', 'closing');
    }, 250);
  }

  // ─── Send Message ────────────────────────────────
  sendBtn.addEventListener('click', handleSend);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  function handleSend() {
    const text = input.value.trim();
    if (!text) return;

    addUserMessage(text);
    input.value = '';
    chipsEl.innerHTML = '';

    // Show typing indicator then respond
    showTyping();
    const delay = 600 + Math.random() * 800;
    setTimeout(() => {
      removeTyping();
      const response = generateResponse(text);
      addBotMessage(response.text);
      if (response.chips && response.chips.length) {
        showChips(response.chips);
      }
    }, delay);
  }

  // ─── Chip Click Handler ──────────────────────────
  function handleChipClick(text) {
    addUserMessage(text);
    chipsEl.innerHTML = '';

    showTyping();
    setTimeout(() => {
      removeTyping();
      const response = generateResponse(text);
      addBotMessage(response.text);
      if (response.chips && response.chips.length) {
        showChips(response.chips);
      }
    }, 600 + Math.random() * 600);
  }

  // ─── DOM Helpers ─────────────────────────────────
  function addBotMessage(text) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bot';
    bubble.innerHTML = `${text}<span class="bubble-time">${getTimeStr()}</span>`;
    messagesEl.appendChild(bubble);
    scrollToBottom();
  }

  function addUserMessage(text) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble user';
    bubble.innerHTML = `${escapeHtml(text)}<span class="bubble-time">${getTimeStr()}</span>`;
    messagesEl.appendChild(bubble);
    scrollToBottom();
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'typing-indicator';
    el.id = 'typingIndicator';
    el.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function removeTyping() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
  }

  function showChips(chips) {
    chipsEl.innerHTML = '';
    chips.forEach(label => {
      const btn = document.createElement('button');
      btn.className = 'chip-btn';
      btn.textContent = label;
      btn.addEventListener('click', () => handleChipClick(label));
      chipsEl.appendChild(btn);
    });
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  function getTimeStr() {
    const now = new Date();
    return now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Greeting ────────────────────────────────────
  function getGreeting() {
    const hour = new Date().getHours();
    let timeGreet = 'Hello';
    if (hour < 12) timeGreet = 'Good morning';
    else if (hour < 17) timeGreet = 'Good afternoon';
    else timeGreet = 'Good evening';

    return `${timeGreet}! 👋 I'm <strong>WeatherBot</strong>, your weather assistant.<br><br>I can help you with:<br>• 🔍 How to use this app<br>• 🌡️ Current weather info & tips<br>• 👕 What to wear today<br>• ☂️ Rain / umbrella advice<br>• 🏃 Activity suggestions<br><br>Ask me anything or tap a quick option below!`;
  }

  function getInitialChips() {
    return [
      'How to use the app?',
      'Current weather info',
      'What should I wear?',
      'Do I need an umbrella?',
      'Activity suggestions'
    ];
  }

  // ─── Get Live Weather Context ────────────────────
  function getWeatherContext() {
    // Read from the main app's global state
    if (typeof currentData !== 'undefined' && currentData) {
      const w = currentData;
      return {
        available: true,
        city: w.name || '—',
        country: w.sys?.country || '',
        temp: Math.round(w.main?.temp || 0),
        feelsLike: Math.round(w.main?.feels_like || 0),
        humidity: w.main?.humidity || 0,
        windSpeed: Math.round((w.wind?.speed || 0) * 3.6),
        condition: w.weather?.[0]?.main || '',
        description: w.weather?.[0]?.description || '',
        visibility: w.visibility ? (w.visibility / 1000).toFixed(1) : 'N/A',
        pressure: w.main?.pressure || 0,
        tempMin: Math.round(w.main?.temp_min || 0),
        tempMax: Math.round(w.main?.temp_max || 0),
      };
    }
    return { available: false };
  }

  // ─── Response Generator ──────────────────────────
  function generateResponse(userText) {
    const q = userText.toLowerCase().trim();
    const ctx = getWeatherContext();

    // ── App usage / How to instructions ──
    if (matches(q, ['how to use', 'how does', 'how do i', 'instructions', 'help me', 'guide', 'tutorial', 'how to search', 'how this works'])) {
      return {
        text: `Here's how to use <strong>WeatherNow</strong>: 📱<br><br>` +
              `<strong>1. Search a City</strong><br>Type a city name in the search bar at the top and press Enter. You'll see auto-suggestions as you type!<br><br>` +
              `<strong>2. Use Your Location</strong><br>Click the 📍 location pin button next to the search bar to get weather for your current location.<br><br>` +
              `<strong>3. Switch Units</strong><br>Toggle between °C and °F using the buttons next to the temperature display.<br><br>` +
              `<strong>4. View Details</strong><br>Scroll down to see humidity, wind speed, visibility, pressure, sunrise/sunset times, 5-day forecast, and hourly forecast.<br><br>` +
              `<strong>5. Explore Themes</strong><br>The background changes dynamically based on the weather — try searching cities with different conditions! 🌈`,
        chips: ['Current weather info', 'What should I wear?', 'Search tips']
      };
    }

    // ── Search tips ──
    if (matches(q, ['search tip', 'search advice', 'search help', 'find city', 'search for'])) {
      return {
        text: `🔍 <strong>Search Tips:</strong><br><br>` +
              `• Type at least 2 characters to see auto-suggestions<br>` +
              `• You can search by city name (e.g. "London", "Tokyo")<br>` +
              `• Press Enter to search, or click a suggestion<br>` +
              `• Use the ✕ button to clear the search<br>` +
              `• The 📍 button uses your GPS for local weather<br><br>` +
              `Your last searched city is remembered automatically! 💾`,
        chips: ['Current weather info', 'How to use the app?']
      };
    }

    // ── Current weather ──
    if (matches(q, ['current weather', 'weather now', 'weather info', 'what is the weather', 'tell me the weather', 'temperature now', 'how hot', 'how cold', "what's the weather", 'weather report', 'today weather'])) {
      if (!ctx.available) {
        return {
          text: `I don't have weather data loaded yet. Try searching for a city first using the search bar at the top! 🔍`,
          chips: ['How to use the app?']
        };
      }
      return {
        text: `📍 <strong>${ctx.city}, ${ctx.country}</strong><br><br>` +
              `🌡️ Temperature: <strong>${ctx.temp}°C</strong> (feels like ${ctx.feelsLike}°C)<br>` +
              `📊 Range: ${ctx.tempMin}°C – ${ctx.tempMax}°C<br>` +
              `☁️ Condition: <strong>${ctx.description}</strong><br>` +
              `💧 Humidity: ${ctx.humidity}%<br>` +
              `💨 Wind: ${ctx.windSpeed} km/h<br>` +
              `👁 Visibility: ${ctx.visibility} km<br>` +
              `🌡 Pressure: ${ctx.pressure} hPa`,
        chips: ['What should I wear?', 'Do I need an umbrella?', 'Activity suggestions']
      };
    }

    // ── What to wear ──
    if (matches(q, ['what to wear', 'what should i wear', 'outfit', 'dress', 'clothing', 'clothes', 'wear today'])) {
      if (!ctx.available) {
        return {
          text: `Search for a city first so I can check the weather and suggest what to wear! 👕`,
          chips: ['How to use the app?']
        };
      }
      let advice = getClothingAdvice(ctx);
      return {
        text: `👕 <strong>What to Wear in ${ctx.city}</strong> (${ctx.temp}°C, ${ctx.description})<br><br>${advice}`,
        chips: ['Do I need an umbrella?', 'Activity suggestions', 'Current weather info']
      };
    }

    // ── Umbrella / Rain ──
    if (matches(q, ['umbrella', 'rain', 'will it rain', 'is it raining', 'rainy', 'precipitation', 'drizzle', 'shower'])) {
      if (!ctx.available) {
        return {
          text: `Load weather for a city first, then I can tell you if you need an umbrella! ☂️`,
          chips: ['How to use the app?']
        };
      }
      const cond = ctx.condition.toLowerCase();
      if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower')) {
        return {
          text: `☔ <strong>Yes, take an umbrella!</strong><br><br>It's currently <strong>${ctx.description}</strong> in ${ctx.city}. Don't forget waterproof shoes too!<br><br>💡 <em>Tip: Check the hourly forecast below the main weather card for when the rain might ease up.</em>`,
          chips: ['What should I wear?', 'Current weather info']
        };
      } else if (cond.includes('cloud') || cond.includes('mist') || cond.includes('fog')) {
        return {
          text: `🌥️ It's <strong>${ctx.description}</strong> in ${ctx.city} right now — no rain at the moment, but it could change. Maybe keep a small umbrella handy just in case!<br><br>💡 <em>Tip: Scroll down to check the 5-day forecast for upcoming rain.</em>`,
          chips: ['Activity suggestions', 'Current weather info']
        };
      } else {
        return {
          text: `☀️ No umbrella needed! The weather in ${ctx.city} is <strong>${ctx.description}</strong>. Enjoy the day! 🎉`,
          chips: ['What should I wear?', 'Activity suggestions']
        };
      }
    }

    // ── Activity / Things to do ──
    if (matches(q, ['activity', 'things to do', 'what can i do', 'suggestions', 'plan', 'outdoor', 'indoor', 'exercise'])) {
      if (!ctx.available) {
        return {
          text: `Search for a city first, and I'll suggest activities based on the weather! 🏃`,
          chips: ['How to use the app?']
        };
      }
      let activities = getActivitySuggestions(ctx);
      return {
        text: `🎯 <strong>Activity Suggestions for ${ctx.city}</strong><br>(${ctx.temp}°C, ${ctx.description})<br><br>${activities}`,
        chips: ['What should I wear?', 'Current weather info']
      };
    }

    // ── Temperature / Hot / Cold ──
    if (matches(q, ['how warm', 'is it hot', 'is it cold', 'is it warm', 'freezing', 'temp', 'degree'])) {
      if (!ctx.available) {
        return {
          text: `I need weather data to answer that! Search for a city using the search bar above. 🌡️`,
          chips: ['How to use the app?']
        };
      }
      let feel = '';
      if (ctx.temp <= 0) feel = `🥶 It's <strong>freezing</strong> at ${ctx.temp}°C! Bundle up heavily.`;
      else if (ctx.temp <= 10) feel = `❄️ It's quite <strong>cold</strong> at ${ctx.temp}°C. Wear warm layers!`;
      else if (ctx.temp <= 20) feel = `🌤️ It's <strong>mild</strong> at ${ctx.temp}°C. A light jacket should be fine.`;
      else if (ctx.temp <= 30) feel = `☀️ It's <strong>warm</strong> at ${ctx.temp}°C. Light clothing recommended!`;
      else feel = `🔥 It's <strong>very hot</strong> at ${ctx.temp}°C! Stay hydrated and seek shade.`;

      return {
        text: `🌡️ <strong>${ctx.city}</strong>: ${feel}<br><br>Feels like: ${ctx.feelsLike}°C · Humidity: ${ctx.humidity}%`,
        chips: ['What should I wear?', 'Activity suggestions']
      };
    }

    // ── Wind ──
    if (matches(q, ['wind', 'windy', 'breeze', 'gust'])) {
      if (!ctx.available) {
        return { text: `Search for a city to check wind conditions! 💨`, chips: ['How to use the app?'] };
      }
      let windMsg = '';
      if (ctx.windSpeed < 10) windMsg = `Light breeze — perfect for outdoor activities.`;
      else if (ctx.windSpeed < 25) windMsg = `Moderate wind — you'll feel it but nothing dangerous.`;
      else if (ctx.windSpeed < 50) windMsg = `Strong wind — hold on to your hat! Consider indoor activities.`;
      else windMsg = `⚠️ Very strong winds — stay indoors if possible!`;

      return {
        text: `💨 <strong>Wind in ${ctx.city}:</strong> ${ctx.windSpeed} km/h<br><br>${windMsg}`,
        chips: ['Current weather info', 'Activity suggestions']
      };
    }

    // ── Humidity ──
    if (matches(q, ['humid', 'humidity', 'moisture', 'damp', 'dry'])) {
      if (!ctx.available) {
        return { text: `Search for a city to check humidity levels! 💧`, chips: ['How to use the app?'] };
      }
      let humMsg = '';
      if (ctx.humidity < 30) humMsg = `Very dry — keep hydrated and moisturize your skin.`;
      else if (ctx.humidity < 60) humMsg = `Comfortable humidity — should feel pleasant outside!`;
      else if (ctx.humidity < 80) humMsg = `Moderately humid — you might feel a bit sticky.`;
      else humMsg = `Very humid — expect sweating even with light activity. Stay cool! 🥵`;

      return {
        text: `💧 <strong>Humidity in ${ctx.city}:</strong> ${ctx.humidity}%<br><br>${humMsg}`,
        chips: ['Current weather info', 'What should I wear?']
      };
    }

    // ── Sunrise / Sunset ──
    if (matches(q, ['sunrise', 'sunset', 'golden hour', 'dawn', 'dusk', 'sun'])) {
      const sunrise = document.getElementById('statSunriseVal')?.textContent || '—';
      const sunset  = document.getElementById('statSunsetVal')?.textContent || '—';
      const city    = ctx.available ? ctx.city : 'your city';
      return {
        text: `🌅 <strong>Sun Times for ${city}:</strong><br><br>☀️ Sunrise: <strong>${sunrise}</strong><br>🌇 Sunset: <strong>${sunset}</strong><br><br>💡 <em>Tip: Golden hour for photography is about 30 minutes after sunrise or before sunset!</em>`,
        chips: ['Current weather info', 'Activity suggestions']
      };
    }

    // ── Forecast ──
    if (matches(q, ['forecast', '5 day', 'five day', 'week', 'tomorrow', 'upcoming', 'next days', 'later'])) {
      return {
        text: `📅 <strong>Forecast Information:</strong><br><br>Scroll down on the main screen to find:<br><br>📊 <strong>5-Day Forecast</strong> — Shows the weather trend for the next 5 days with high/low temps.<br><br>⏰ <strong>Hourly Forecast</strong> — Shows 3-hour intervals for today. Swipe left/right to see more!<br><br>💡 <em>Tip: The forecast updates automatically when you search a new city.</em>`,
        chips: ['Current weather info', 'Do I need an umbrella?']
      };
    }

    // ── Units / Celsius / Fahrenheit ──
    if (matches(q, ['celsius', 'fahrenheit', 'unit', 'convert', 'switch unit', 'change unit'])) {
      return {
        text: `🌡️ <strong>Switching Temperature Units:</strong><br><br>Look at the large temperature display on the main screen. You'll see <strong>°C | °F</strong> buttons next to it.<br><br>• Click <strong>°C</strong> for Celsius<br>• Click <strong>°F</strong> for Fahrenheit<br><br>All temperatures (current, forecast, hourly) will update instantly! ⚡`,
        chips: ['Current weather info', 'How to use the app?']
      };
    }

    // ── Thanks / Bye ──
    if (matches(q, ['thank', 'thanks', 'bye', 'goodbye', 'see you', 'great', 'awesome', 'perfect', 'nice', 'cool'])) {
      const responses = [
        `You're welcome! 😊 Happy to help. Have a wonderful day!`,
        `Glad I could help! 🌟 Enjoy the weather!`,
        `Anytime! 🎉 Feel free to ask if you need anything else.`,
        `Thanks for chatting! ☀️ Stay awesome!`
      ];
      return {
        text: responses[Math.floor(Math.random() * responses.length)],
        chips: ['Current weather info', 'How to use the app?']
      };
    }

    // ── Hello / Hi ──
    if (matches(q, ['hi', 'hello', 'hey', 'yo', 'sup', 'good morning', 'good afternoon', 'good evening'])) {
      return {
        text: `Hey there! 👋 How can I help you today? You can ask me about the weather, how to use the app, or get outfit & activity suggestions! 🌤️`,
        chips: getInitialChips()
      };
    }

    // ── Location ──
    if (matches(q, ['location', 'gps', 'my location', 'where am i', 'geolocation', 'detect my city'])) {
      return {
        text: `📍 <strong>Using Your Location:</strong><br><br>Click the <strong>📍 pin button</strong> next to the search bar. Your browser will ask permission to share your location. Once you allow it, WeatherNow will show weather for your exact location!<br><br>⚠️ <em>Make sure location services are enabled in your browser settings.</em>`,
        chips: ['How to use the app?', 'Current weather info']
      };
    }

    // ── Visibility ──
    if (matches(q, ['visibility', 'fog', 'mist', 'haze', 'smog', 'can i see'])) {
      if (!ctx.available) {
        return { text: `Search for a city to check visibility! 👁`, chips: ['How to use the app?'] };
      }
      let visMsg = '';
      const vis = parseFloat(ctx.visibility);
      if (isNaN(vis)) visMsg = 'Visibility data is not available right now.';
      else if (vis >= 10) visMsg = `Excellent visibility — you can see far and clear! Great for driving and sightseeing.`;
      else if (vis >= 4) visMsg = `Good visibility — shouldn't cause any issues.`;
      else if (vis >= 1) visMsg = `Reduced visibility — be cautious while driving. ⚠️`;
      else visMsg = `⚠️ Very poor visibility — avoid driving if possible. Conditions are foggy/misty.`;

      return {
        text: `👁 <strong>Visibility in ${ctx.city}:</strong> ${ctx.visibility} km<br><br>${visMsg}`,
        chips: ['Current weather info', 'Activity suggestions']
      };
    }

    // ── Pressure ──
    if (matches(q, ['pressure', 'barometer', 'atmospheric'])) {
      if (!ctx.available) {
        return { text: `Search for a city to check atmospheric pressure! 🌡`, chips: ['How to use the app?'] };
      }
      let pressMsg = '';
      if (ctx.pressure >= 1020) pressMsg = `High pressure — generally clear and fair weather expected.`;
      else if (ctx.pressure >= 1010) pressMsg = `Normal pressure — stable weather conditions.`;
      else pressMsg = `Low pressure — could indicate incoming clouds or rain. Stay alert! ⚠️`;

      return {
        text: `🌡 <strong>Pressure in ${ctx.city}:</strong> ${ctx.pressure} hPa<br><br>${pressMsg}`,
        chips: ['Do I need an umbrella?', 'Current weather info']
      };
    }

    // ── Fallback ──
    const fallbacks = [
      `I'm not sure about that one! 🤔 I'm best at answering weather-related questions and helping you use the app. Try asking about the current weather, what to wear, or app features!`,
      `Hmm, I didn't quite catch that. 😅 I can help with weather info, outfit advice, activity ideas, and app instructions. What would you like to know?`,
      `That's outside my expertise! 🌤️ I'm your weather buddy — ask me about temperatures, rain, forecasts, or how to use WeatherNow!`
    ];
    return {
      text: fallbacks[Math.floor(Math.random() * fallbacks.length)],
      chips: getInitialChips()
    };
  }

  // ─── Keyword Matcher ─────────────────────────────
  function matches(input, keywords) {
    return keywords.some(kw => input.includes(kw));
  }

  // ─── Clothing Advice Engine ──────────────────────
  function getClothingAdvice(ctx) {
    const temp = ctx.temp;
    const cond = ctx.condition.toLowerCase();
    let lines = [];

    // Temperature-based
    if (temp <= 0) {
      lines.push(`🧥 <strong>Heavy winter gear</strong> — insulated coat, thermal layers, gloves, scarf, and warm boots.`);
      lines.push(`🧣 Don't forget a hat to prevent heat loss!`);
    } else if (temp <= 10) {
      lines.push(`🧥 <strong>Warm layers</strong> — a good jacket or coat with a sweater underneath.`);
      lines.push(`👖 Jeans or warm trousers with closed shoes.`);
    } else if (temp <= 18) {
      lines.push(`🧥 <strong>Light jacket or hoodie</strong> — it's cool but manageable.`);
      lines.push(`👕 Long sleeves with comfortable pants.`);
    } else if (temp <= 25) {
      lines.push(`👕 <strong>Light clothing</strong> — t-shirt, light pants or shorts.`);
      lines.push(`🩴 Breathable fabrics are perfect!`);
    } else if (temp <= 35) {
      lines.push(`🩳 <strong>Cool and airy clothing</strong> — shorts, tank tops, sandals.`);
      lines.push(`🧴 Don't forget sunscreen and sunglasses!`);
    } else {
      lines.push(`🥵 <strong>Minimal, loose clothing</strong> — it's extremely hot!`);
      lines.push(`💧 Stay hydrated and wear light colors to reflect heat.`);
    }

    // Condition-based additions
    if (cond.includes('rain') || cond.includes('drizzle')) {
      lines.push(`☔ Bring an <strong>umbrella</strong> and wear waterproof shoes!`);
    }
    if (cond.includes('snow')) {
      lines.push(`❄️ Waterproof boots and <strong>layered clothing</strong> are essential!`);
    }
    if (ctx.windSpeed > 25) {
      lines.push(`💨 It's windy — a <strong>windbreaker jacket</strong> would be smart.`);
    }
    if (ctx.humidity > 75 && temp > 20) {
      lines.push(`💦 High humidity — choose <strong>moisture-wicking fabrics</strong> to stay comfortable.`);
    }

    return lines.join('<br>');
  }

  // ─── Activity Suggestions Engine ─────────────────
  function getActivitySuggestions(ctx) {
    const temp = ctx.temp;
    const cond = ctx.condition.toLowerCase();
    let lines = [];

    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('storm')) {
      lines.push(`🏠 <strong>Indoor Activities:</strong>`);
      lines.push(`&nbsp;&nbsp;• Visit a museum or art gallery`);
      lines.push(`&nbsp;&nbsp;• Cozy up with a book or movie`);
      lines.push(`&nbsp;&nbsp;• Try cooking a new recipe`);
      lines.push(`&nbsp;&nbsp;• Indoor gym or yoga session`);
      lines.push(`&nbsp;&nbsp;• Board games with friends/family 🎲`);
    } else if (cond.includes('snow')) {
      lines.push(`❄️ <strong>Snow Activities:</strong>`);
      lines.push(`&nbsp;&nbsp;• Build a snowman ⛄`);
      lines.push(`&nbsp;&nbsp;• Go skiing or snowboarding`);
      lines.push(`&nbsp;&nbsp;• Enjoy hot cocoa by the window`);
      lines.push(`&nbsp;&nbsp;• Winter photography 📸`);
    } else if (temp > 28) {
      lines.push(`☀️ <strong>Hot Weather Activities:</strong>`);
      lines.push(`&nbsp;&nbsp;• Swimming or visit a water park 🏊`);
      lines.push(`&nbsp;&nbsp;• Early morning or evening walks`);
      lines.push(`&nbsp;&nbsp;• Enjoy ice cream or cold drinks 🍦`);
      lines.push(`&nbsp;&nbsp;• Visit air-conditioned malls or cinemas`);
      lines.push(`&nbsp;&nbsp;• Beach trip if near the coast! 🏖️`);
    } else if (temp > 15) {
      lines.push(`🌤️ <strong>Perfect Weather Activities:</strong>`);
      lines.push(`&nbsp;&nbsp;• Go for a walk or jog in the park 🏃`);
      lines.push(`&nbsp;&nbsp;• Picnic with friends/family 🧺`);
      lines.push(`&nbsp;&nbsp;• Cycling or skateboarding 🚴`);
      lines.push(`&nbsp;&nbsp;• Outdoor photography`);
      lines.push(`&nbsp;&nbsp;• Explore your city's attractions 🗺️`);
    } else {
      lines.push(`🌬️ <strong>Cool Weather Activities:</strong>`);
      lines.push(`&nbsp;&nbsp;• Warm drinks at a café ☕`);
      lines.push(`&nbsp;&nbsp;• Brisk walk in a park`);
      lines.push(`&nbsp;&nbsp;• Visit a bookstore or library 📚`);
      lines.push(`&nbsp;&nbsp;• Indoor rock climbing`);
      lines.push(`&nbsp;&nbsp;• Cook comfort food at home 🍲`);
    }

    return lines.join('<br>');
  }

})();
