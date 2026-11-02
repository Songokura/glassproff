(function(){
  'use strict';
  var d=document;
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Шапка: линия после прокрутки. Липкая панель: после ~55% первого экрана, прячется на контактах */
  var hdr=d.querySelector('.hdr'), mbar=d.querySelector('.mbar'), kont=d.getElementById('kontakty');
  function onScroll(){
    hdr.classList.toggle('is-scrolled', window.scrollY>8);
    if(mbar){ var k=kont?kont.getBoundingClientRect().top:Infinity; mbar.classList.toggle('is-on', window.scrollY>window.innerHeight*.55 && k>window.innerHeight*.6); }
  }
  window.addEventListener('scroll', onScroll, {passive:true}); onScroll();

  /* Мобильное меню */
  var burger=d.querySelector('.burger'), mnav=d.getElementById('mnav');
  function setMenu(open){
    d.body.classList.toggle('menu-open', open);
    mnav.hidden=!open;
    burger.setAttribute('aria-expanded', open?'true':'false');
    burger.setAttribute('aria-label', open?'Закрыть меню':'Открыть меню');
    d.body.style.overflow=open?'hidden':'';
  }
  burger.addEventListener('click', function(){ setMenu(mnav.hidden); });
  mnav.addEventListener('click', function(e){ if(e.target.closest('a')) setMenu(false); });
  d.addEventListener('keydown', function(e){ if(e.key==='Escape' && !mnav.hidden) setMenu(false); });

  /* Стекло в герое: четыре режима плёнки на одном кадре */
  var pane=d.querySelector('.pane'), seg=d.querySelectorAll('.seg button'), note=d.querySelector('.glass-note');
  var notes={
    clear:'Прозрачное - стекло без плёнки, коридор за перегородкой виден целиком.',
    tint:'Тонировка - стекло темнее, меньше бликов и чужих взглядов. От 6 000 ₸/м².',
    frost:'Матовое - свет проходит, за стеклом только силуэты. От 6 000 ₸/м².',
    bands:'Полосы - стекло прозрачное, а на уровне глаз его видно издалека.'
  };
  var touched=false;
  function setGlass(state, fromUser){
    if(fromUser) touched=true;
    pane.setAttribute('data-state', state);
    seg.forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.set===state?'true':'false'); });
    if(fromUser) note.textContent=notes[state].replace(/ (\d) (\d{3})/g,' $1 $2').replace(/ ₸/g,' ₸');
    if(!reduce){ pane.classList.remove('is-sweep'); void pane.offsetWidth; pane.classList.add('is-sweep'); }
  }
  seg.forEach(function(b){ b.addEventListener('click', function(){ setGlass(b.dataset.set, true); }); });

  /* Интро: один раз, медленно - прозрачное, полосы, матовое и обратно к прозрачному. Клик человека отменяет */
  var heroImg=d.querySelector('.pane-img');
  function intro(){
    if(reduce || location.hash || window.scrollY>80) return;
    setTimeout(function(){ if(!touched) setGlass('bands', false); }, 1200);
    setTimeout(function(){ if(!touched) setGlass('frost', false); }, 2400);
    setTimeout(function(){ if(!touched) setGlass('clear', false); }, 3600);
  }
  if(heroImg.complete) intro(); else { heroImg.addEventListener('load', intro); heroImg.addEventListener('error', intro); }

  /* Проявление кадров */
  var rv=d.querySelectorAll('.rv');
  if('IntersectionObserver' in window && !reduce){
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, {rootMargin:'0px 0px -8% 0px', threshold:.08});
    rv.forEach(function(el){ io.observe(el); });
  } else rv.forEach(function(el){ el.classList.add('is-in'); });

  /* До/после: линия идёт за ползунком, при появлении на экране сама отъезжает к середине */
  var ba=d.querySelector('.ba');
  if(ba){
    var range=ba.querySelector('.ba-range'), baTouched=false, anim=null;
    function setX(v){ ba.style.setProperty('--x', v+'%'); }
    range.addEventListener('input', function(){ baTouched=true; if(anim) cancelAnimationFrame(anim); setX(range.value); });
    range.addEventListener('pointerdown', function(){ baTouched=true; if(anim) cancelAnimationFrame(anim); });
    function reveal(){
      if(reduce || baTouched){ setX(50); range.value=50; return; }
      var from=88, to=50, t0=null, dur=1400;
      setX(from); range.value=from;
      function step(ts){
        if(baTouched) return;
        if(!t0) t0=ts;
        var p=Math.min(1,(ts-t0)/dur); p=1-Math.pow(1-p,3);
        var v=from+(to-from)*p; setX(v); range.value=v;
        if(p<1) anim=requestAnimationFrame(step);
      }
      anim=requestAnimationFrame(step);
    }
    if('IntersectionObserver' in window){
      var bio=new IntersectionObserver(function(es){
        es.forEach(function(e){ if(e.isIntersecting){ setTimeout(reveal, 250); bio.disconnect(); } });
      }, {threshold:.5});
      bio.observe(ba);
    } else setX(50);
  }

  /* Лента объектов: шаг - одна карточка, крайняя кнопка гаснет, без прокрутки стрелки прячутся */
  var lent=d.querySelector('.lent'), nav=d.querySelector('.lent-nav');
  if(lent && nav){
    var btns=nav.querySelectorAll('.lent-btn');
    function stepPx(){ var c=lent.querySelector('.lent-i'); if(!c) return 300; var gap=parseFloat(getComputedStyle(lent).columnGap||getComputedStyle(lent).gap)||16; return c.getBoundingClientRect().width+gap; }
    function update(){
      var max=lent.scrollWidth-lent.clientWidth;
      nav.hidden = max<=2;
      btns[0].disabled = lent.scrollLeft<=2;
      btns[1].disabled = lent.scrollLeft>=max-2;
    }
    btns.forEach(function(b){ b.addEventListener('click', function(){ lent.scrollBy({left:stepPx()*(+b.dataset.dir), behavior:reduce?'auto':'smooth'}); }); });
    lent.addEventListener('scroll', update, {passive:true});
    var lw=window.innerWidth; window.addEventListener('resize', function(){ if(window.innerWidth===lw) return; lw=window.innerWidth; update(); });
    lent.addEventListener('keydown', function(e){
      if(e.key==='ArrowRight'||e.key==='ArrowLeft'){ e.preventDefault(); lent.scrollBy({left:stepPx()*(e.key==='ArrowRight'?1:-1), behavior:reduce?'auto':'smooth'}); }
    });
    update();
  }

  /* Расчёт */
  var form=d.getElementById('calc');
  if(form){
    var qty=d.getElementById('qty'), sum=d.getElementById('sum'), qtyL=d.getElementById('qty-l'), phone=d.getElementById('phone');
    function fmt(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,' '); }
    function cur(){ var v=(form.querySelector('input[name="what"]:checked')||{}).value||'43000|м²|'; var p=v.split('|'); return {price:+p[0], unit:p[1], name:p[2]}; }
    function calc(){
      var c=cur(), q=Math.max(1, parseInt(qty.value,10)||1);
      qtyL.textContent = c.unit==='м²' ? 'Площадь, м²' : 'Количество, шт';
      sum.textContent='от '+fmt(c.price*q)+' ₸';
    }
    form.addEventListener('change', function(e){
      if(e.target.name==='what'){ var c=cur(); qty.value = c.unit==='м²' ? (c.price>20000?12:20) : 1; }
      calc();
    });
    qty.addEventListener('input', calc);
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var hp=form.querySelector('input[name="website"]'); if(hp && hp.value) return;
      var digits=(phone.value||'').replace(/\D/g,'');
      var fld=phone.closest('.fld');
      if(digits.length<10){ fld.classList.add('is-bad'); phone.focus(); return; }
      fld.classList.remove('is-bad');
      var c=cur(), q=Math.max(1, parseInt(qty.value,10)||1);
      var txt='Здравствуйте! Хочу расчёт.\n'+c.name+'\n'+(c.unit==='м²'?'Площадь: '+q+' м²':'Количество: '+q+' шт')+'\nОриентир с сайта: '+sum.textContent.replace(/ /g,' ')+'\nТелефон: '+phone.value;
      window.open('https://wa.me/77474101009?text='+encodeURIComponent(txt), '_blank', 'noopener');
      var ok=d.getElementById('calc-ok'); if(ok) ok.hidden=false;
    });
    calc();
  }
})();
