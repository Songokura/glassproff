(function(){
  'use strict';
  var d=document, w=window;
  var reduce=w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobileMQ=w.matchMedia('(max-width: 760px)');
  function clamp(v){ return v<0?0:v>1?1:v; }
  function easeOut(t){ return 1-Math.pow(1-t,3); }
  function HH(){ return parseFloat(getComputedStyle(d.documentElement).getPropertyValue('--hh'))||76; }

  /* Шапка и липкая панель */
  var hdr=d.querySelector('.hdr'), mbar=d.querySelector('.mbar'), kont=d.getElementById('kontakty');

  /* Мобильное меню */
  var burger=d.querySelector('.burger'), mnav=d.getElementById('mnav');
  function setMenu(open){
    d.body.classList.toggle('menu-open', open);
    mnav.hidden=!open;
    burger.setAttribute('aria-expanded', open?'true':'false');
    burger.setAttribute('aria-label', open?'Закрыть меню':'Открыть меню');
  }
  burger.addEventListener('click', function(){ setMenu(mnav.hidden); });
  mnav.addEventListener('click', function(e){ if(e.target.closest('a')) setMenu(false); });
  d.addEventListener('keydown', function(e){ if(e.key==='Escape' && !mnav.hidden) setMenu(false); });

  /* Якоря: свой скролл с учётом шапки, плиты - без отступа */
  function targetTop(t){
    var r=t.getBoundingClientRect().top + w.scrollY;
    return t.classList.contains('pw') ? r : r - HH();
  }
  d.addEventListener('click', function(e){
    var a=e.target.closest('a[href^="#"]'); if(!a) return;
    var id=a.getAttribute('href').slice(1); if(!id) return;
    var t=d.getElementById(id); if(!t) return;
    e.preventDefault();
    w.scrollTo({top:Math.max(0,targetTop(t)), behavior:reduce?'auto':'smooth'});
    if(history.pushState) history.pushState(null,'','#'+id);
  });

  /* Герой: интро, если открыли с начала страницы; иначе сразу готовое состояние */
  var hero=d.querySelector('.hero');
  var skipIntro = reduce || !!location.hash || w.scrollY>80;
  function startHero(){ hero.classList.add(skipIntro?'now':'lit'); }
  if(d.fonts && d.fonts.ready){ d.fonts.ready.then(startHero, startHero); } else startHero();
  if(location.hash){
    var ht=d.getElementById(location.hash.slice(1));
    if(ht) setTimeout(function(){ w.scrollTo({top:Math.max(0,targetTop(ht)),behavior:'auto'}); }, 60);
  }

  /* fitText: дисплейный заголовок не вылезает за контейнер */
  var fits=d.querySelectorAll('.fit');
  function fitText(){
    fits.forEach(function(el){
      el.style.fontSize='';
      var fs=parseFloat(getComputedStyle(el).fontSize), n=0;
      while(el.scrollWidth>el.clientWidth+1 && n<14){ fs*=.95; el.style.fontSize=fs+'px'; n++; }
    });
  }
  if(d.fonts && d.fonts.ready) d.fonts.ready.then(fitText); else fitText();

  /* Плиты: --enter / --exit / --stay, у фото-плит --open (ракель по трём стёклам) */
  var pws=[].slice.call(d.querySelectorAll('.pw'));
  var H=w.innerHeight, ticking=false, lastW=w.innerWidth;
  var state=pws.map(function(){ return {}; });
  function set(pw, st, k, v){ v=+v.toFixed(3); if(st[k]!==v){ st[k]=v; pw.style.setProperty('--'+k, v); } }
  function frame(){
    ticking=false;
    H=w.innerHeight;
    var y=w.scrollY;
    hdr.classList.toggle('is-scrolled', y>8);
    if(mbar){ var k=kont?kont.getBoundingClientRect().top:Infinity; mbar.classList.toggle('is-on', y>H*.55 && k>H*.6); }
    var rects=pws.map(function(pw){ return pw.getBoundingClientRect(); });
    pws.forEach(function(pw,i){
      var r=rects[i], st=state[i];
      if(r.bottom<-H){ set(pw,st,'enter',1); set(pw,st,'exit',1); pw.classList.add('gone'); return; }
      if(r.top>H*2){ set(pw,st,'enter',0); set(pw,st,'exit',0); pw.classList.remove('gone','on'); return; }
      var enter=clamp(1 - r.top/H);
      var exit=clamp(1 - r.bottom/H);
      var stay=r.height>H+1 ? clamp(-r.top/(r.height-H)) : enter;
      set(pw,st,'enter',enter); set(pw,st,'exit',exit); set(pw,st,'stay',stay);
      pw.classList.toggle('gone', exit>=1);
      pw.classList.toggle('on', enter>0.32);
      if(pw.classList.contains('pw-sp')){
        var open = mobileMQ.matches ? clamp((enter-0.08)/0.5) : clamp((enter-0.18)/0.55);
        set(pw,st,'open',open);
      }
    });
  }
  function onScroll(){ if(!ticking){ ticking=true; requestAnimationFrame(frame); } }
  w.addEventListener('scroll', onScroll, {passive:true});
  w.addEventListener('resize', function(){ if(w.innerWidth===lastW) return; lastW=w.innerWidth; fitText(); onScroll(); });
  frame();

  /* Проявление блоков */
  var rv=d.querySelectorAll('.rv');
  if('IntersectionObserver' in w && !reduce){
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, {rootMargin:'0px 0px -8% 0px', threshold:.06});
    rv.forEach(function(el){ io.observe(el); });
  } else rv.forEach(function(el){ el.classList.add('is-in'); });

  /* Цифры: счётчик с замедлением */
  var facts=d.querySelector('.facts');
  if(facts && 'IntersectionObserver' in w && !reduce){
    var dts=facts.querySelectorAll('dt[data-n]');
    function fmt(n){ return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,' '); }
    var fio=new IntersectionObserver(function(es){
      if(!es[0].isIntersecting) return; fio.disconnect();
      dts.forEach(function(dt){
        var to=+dt.dataset.n, suf=dt.dataset.suf||'', t0=null, dur=1400;
        suf=suf.replace(/&nbsp;/g,' ');
        function step(ts){
          if(!t0) t0=ts; var p=Math.min(1,(ts-t0)/dur); p=1-Math.pow(1-p,3);
          dt.textContent=fmt(Math.round(to*p))+suf;
          if(p<1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, {threshold:.5});
    fio.observe(facts);
  }

  /* Демо плёнки: четыре режима на одном кадре */
  var pane=d.querySelector('.pane'), seg=d.querySelectorAll('.seg button');
  var touched=false;
  function setGlass(stateName, fromUser){
    if(fromUser) touched=true;
    pane.setAttribute('data-state', stateName);
    seg.forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.set===stateName?'true':'false'); });
    if(!reduce){ pane.classList.remove('is-sweep'); void pane.offsetWidth; pane.classList.add('is-sweep'); }
  }
  seg.forEach(function(b){ b.addEventListener('click', function(){ setGlass(b.dataset.set, true); }); });
  var introDone=false;
  function demoIntro(){
    if(introDone || reduce || touched) return; introDone=true;
    setTimeout(function(){ if(!touched) setGlass('bands', false); }, 1100);
    setTimeout(function(){ if(!touched) setGlass('frost', false); }, 2300);
    setTimeout(function(){ if(!touched) setGlass('tint', false); }, 3500);
    setTimeout(function(){ if(!touched) setGlass('clear', false); }, 4700);
  }
  if(pane && 'IntersectionObserver' in w){
    var pio=new IntersectionObserver(function(es){ if(es[0].isIntersecting){ demoIntro(); pio.disconnect(); } }, {threshold:.5});
    pio.observe(pane);
  }

  /* Галереи фото в блоках: шаг - один кадр, счётчик, крайняя кнопка гаснет, без прокрутки стрелки прячутся */
  d.querySelectorAll('.gal').forEach(function(g){
    var t=g.querySelector('.gal-track'), nv=g.querySelector('.gal-nav');
    if(!t || !nv) return;
    var bs=nv.querySelectorAll('.gal-btn'), cnt=nv.querySelector('.gal-n'), items=t.children, raf=0;
    function step(){ var gap=parseFloat(getComputedStyle(t).columnGap)||0; return items[0].getBoundingClientRect().width+gap; }
    function upd(){
      raf=0;
      var max=t.scrollWidth-t.clientWidth, x=t.scrollLeft;
      nv.hidden = max<=2;
      bs[0].disabled = x<=2;
      bs[1].disabled = x>=max-2;
      var i = x>=max-2 ? items.length-1 : Math.round(x/step());
      if(cnt) cnt.textContent=(i+1)+' / '+items.length;
    }
    function go(dir){ t.scrollBy({left:step()*dir, behavior:reduce?'auto':'smooth'}); }
    bs.forEach(function(b){ b.addEventListener('click', function(){ go(+b.dataset.dir); }); });
    t.addEventListener('scroll', function(){ if(!raf) raf=requestAnimationFrame(upd); }, {passive:true});
    t.addEventListener('keydown', function(e){
      if(e.key==='ArrowRight'||e.key==='ArrowLeft'){ e.preventDefault(); go(e.key==='ArrowRight'?1:-1); }
    });
    var gw=w.innerWidth; w.addEventListener('resize', function(){ if(w.innerWidth===gw) return; gw=w.innerWidth; upd(); });
    upd();
  });

  /* Лента объектов: шаг - одна карточка, крайняя кнопка гаснет, без прокрутки стрелки прячутся */
  d.querySelectorAll('.lent').forEach(function(lent){
    var sec=lent.closest('section'), nav=sec&&sec.querySelector('.lent-nav');
    if(!nav) return;
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
    var lw=w.innerWidth; w.addEventListener('resize', function(){ if(w.innerWidth===lw) return; lw=w.innerWidth; update(); });
    lent.addEventListener('keydown', function(e){
      if(e.key==='ArrowRight'||e.key==='ArrowLeft'){ e.preventDefault(); lent.scrollBy({left:stepPx()*(e.key==='ArrowRight'?1:-1), behavior:reduce?'auto':'smooth'}); }
    });
    update();
  });

  var form=d.getElementById('calc');
  if(form){
    var qty=d.getElementById('qty'), sum=d.getElementById('sum'), qtyL=d.getElementById('qty-l'), phone=d.getElementById('phone');
    function fmtS(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,' '); }
    function cur(){ var v=(form.querySelector('input[name="what"]:checked')||{}).value||'43000|м²|'; var p=v.split('|'); return {price:+p[0], unit:p[1], name:p[2]}; }
    function calc(){
      var c=cur(), q=Math.max(1, parseInt(qty.value,10)||1);
      qtyL.textContent = c.unit==='м²' ? 'Площадь, м²' : 'Количество, шт';
      sum.textContent='от '+fmtS(c.price*q)+' ₸';
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
      var txt='Здравствуйте! Хочу расчёт.\n'+c.name+'\n'+(c.unit==='м²'?'Площадь: '+q+' м²':'Количество: '+q+' шт')+'\nОриентир с сайта: '+sum.textContent.replace(/ /g,' ')+'\nТелефон: '+phone.value;
      w.open('https://wa.me/77474101009?text='+encodeURIComponent(txt), '_blank', 'noopener');
      var ok=d.getElementById('calc-ok'); if(ok) ok.hidden=false;
    });
    calc();
  }
})();
