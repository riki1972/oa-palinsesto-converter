
const fetch = require('node-fetch');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    const { url } = JSON.parse(event.body);
    if (!url || !url.includes('oasport.it')) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Link non valido' }) };
    }
    try {
        const response = await fetch(url);
        const html = await response.text();
        const events = [];
        const timeRegex = /(\d{2}:\d{2})\s+(.+?)(?=canale|tv|streaming|$)/gi;
        let match;
        while ((match = timeRegex.exec(html)) !== null) {
            const time = match[1];
            let title = match[2].trim().replace(/\s+/g, ' ').substring(0, 100);
            if (title.length > 5) events.push({ time, title, channels: ['Canale non specificato'] });
        }
        if (events.length === 0) {
            events.push({ time: "10:00", title: "Esempio evento", channels: ["Rai 1"] });
        }
        const finalHtml = generateHtml(events);
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html: finalHtml }) };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};

function generateHtml(events) {
    const eventsJs = JSON.stringify(events);
    return `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📺 Palinsesto Sport Oggi</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; padding: 20px; color: #1a2c3e; }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #0f2b3d 0%, #1b4f6e 100%); color: white; padding: 20px 25px; border-radius: 20px; margin-bottom: 25px; }
        .header h1 { font-size: 1.8rem; display: flex; justify-content: space-between; flex-wrap: wrap; }
        .header h1 small { font-size: 0.9rem; background: rgba(255,255,255,0.2); padding: 5px 12px; border-radius: 30px; }
        .filters { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 25px; background: white; padding: 12px 20px; border-radius: 50px; }
        .filter-btn { background: #e9ecef; border: none; padding: 6px 18px; border-radius: 30px; font-weight: 600; font-size: 0.8rem; cursor: pointer; }
        .filter-btn.active { background: #1b6b8f; color: white; }
        .timeline { display: flex; flex-direction: column; gap: 12px; }
        .event-card { background: white; border-radius: 16px; padding: 14px 20px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; border-left: 5px solid #2c7da0; }
        .event-card.live-now { background: #fffae6; border-left-color: #e6a017; }
        .time-block { min-width: 95px; font-weight: 800; background: #eef2f7; padding: 5px 10px; border-radius: 30px; text-align: center; font-family: monospace; }
        .sport-cat { min-width: 100px; background: #eef2f5; padding: 4px 10px; border-radius: 30px; text-align: center; font-size: 0.7rem; font-weight: 600; }
        .event-title { flex: 3; font-weight: 600; font-size: 0.95rem; }
        .channels { flex: 2; display: flex; flex-wrap: wrap; gap: 8px; }
        .channel-badge { background: #f4f6f9; padding: 4px 12px; border-radius: 30px; font-size: 0.7rem; }
        @media (max-width: 850px) { .event-card { flex-direction: column; align-items: flex-start; } .time-block, .sport-cat, .event-title, .channels { width: 100%; } }
        footer { margin-top: 35px; text-align: center; font-size: 0.7rem; color: #7f8c8d; }
    </style>
</head>
<body>
<div class="container">
    <div class="header"><h1>📺 Sport in TV e Streaming <small id="dataOggi"></small></h1><p>🗓️ Generato automaticamente da OA Sport</p></div>
    <div class="filters" id="filterBar"><button class="filter-btn active" data-cat="all">🏁 Tutti</button><button class="filter-btn" data-cat="Ciclismo">🚴 Ciclismo</button><button class="filter-btn" data-cat="Tennis">🎾 Tennis</button><button class="filter-btn" data-cat="Motori">🏎️ Motori</button><button class="filter-btn" data-cat="Calcio">⚽ Calcio</button><button class="filter-btn" data-cat="Altro">🏀 Altri sport</button></div>
    <div class="timeline" id="timelineContainer"></div>
    <footer>Fonte: OA Sport</footer>
</div>
<script>
    const oggi = new Date();
    document.getElementById('dataOggi').innerText = oggi.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const events = ${eventsJs};
    const categorize = t => { const l=t.toLowerCase(); if(l.includes('moto')||l.includes('superbike')||l.includes('formula e')) return 'Motori'; if(l.includes('calcio')||l.includes('serie a')||l.includes('fa cup')) return 'Calcio'; if(l.includes('ciclismo')||l.includes('giro')) return 'Ciclismo'; if(l.includes('tennis')) return 'Tennis'; return 'Altro'; };
    const eventsWithCat = events.map(ev => ({ ...ev, category: categorize(ev.title) }));
    function render(fc='all') {
        const cont = document.getElementById('timelineContainer'); cont.innerHTML='';
        const nowMin = new Date().getHours()*60+new Date().getMinutes();
        eventsWithCat.filter(e=>fc==='all'||e.category===fc).sort((a,b)=>a.time.localeCompare(b.time)).forEach(ev=>{
            const [h,m]=ev.time.split(':'); const evMin=parseInt(h)*60+parseInt(m); const live=(evMin<=nowMin&&nowMin<evMin+120);
            const card = document.createElement('div'); card.className='event-card'+(live?' live-now':'');
            card.innerHTML = '<div class="time-block">'+ev.time+'</div><div class="sport-cat">'+ev.category+'</div><div class="event-title">'+ev.title+'</div><div class="channels">'+ev.channels.map(ch=>'<span class="channel-badge">'+ch+'</span>').join('')+'</div>';
            cont.appendChild(card);
        });
        if(!cont.children.length) cont.innerHTML='<div style="background:white; border-radius:20px; padding:40px; text-align:center;">Nessun evento per questa categoria.</div>';
    }
    document.querySelectorAll('.filter-btn').forEach(btn=>{btn.onclick=()=>{document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); render(btn.dataset.cat);};});
    render('all');
</script>
</body>
</html>`;
}
