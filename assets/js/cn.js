
(function(){
  var modal=document.getElementById('wxModal');
  function toast(t){var el=document.createElement('div');el.className='toast';el.textContent=t;document.body.appendChild(el);
    requestAnimationFrame(function(){el.classList.add('show')});setTimeout(function(){el.classList.remove('show');setTimeout(function(){el.remove()},300)},1800)}
  function copy(t){
    if(navigator.clipboard&&window.isSecureContext){return navigator.clipboard.writeText(t)}
    var a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();
    try{document.execCommand('copy')}catch(e){}a.remove();return Promise.resolve();
  }
  document.addEventListener('click',function(e){
    var w=e.target.closest('[data-wx]');
    if(w){e.preventDefault();modal.classList.add('open');return}
    if(e.target===modal||e.target.closest('.wx-close')){modal.classList.remove('open');return}
    var c=e.target.closest('[data-copy]');
    if(c){copy(c.dataset.copy).then(function(){toast('微信号已复制，打开微信添加好友即可')})}
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape')modal.classList.remove('open')});

  var form=document.getElementById('cnForm');
  if(form){
    var prod=new URLSearchParams(location.search).get('product');
    if(prod)form.message.value='我想咨询：'+prod+'\n';
    form.addEventListener('submit',function(e){
      e.preventDefault();var ok=true;
      ['name','phone','message'].forEach(function(n){var f=form[n],bad=!f.value.trim();f.style.borderColor=bad?'#D9534F':'';if(bad)ok=false});
      if(!ok){toast('请填写带 * 的必填项');return}
      var it=Array.prototype.map.call(form.querySelectorAll('[name=interest]:checked'),function(c){return c.value}).join('、');
      var text='【官网询价】\n称呼：'+form.name.value+'\n电话/微信：'+form.phone.value+'\n公司/店铺：'+(form.company.value||'-')+
        '\n预计数量：'+(form.quantity.value||'-')+'\n采购类型：'+(it||'-')+'\n需求：'+form.message.value;
      copy(text);
      document.getElementById('formOk').style.display='block';
      var tel=(window.SITE_CONTACT||{}).tel;
      if(/iPhone|iPad|iPod/i.test(navigator.userAgent)){location.href='sms:'+tel+'&body='+encodeURIComponent(text)}
      else if(/Android/i.test(navigator.userAgent)){location.href='sms:'+tel+'?body='+encodeURIComponent(text)}
      else{modal.classList.add('open')}
    });
  }
})();
