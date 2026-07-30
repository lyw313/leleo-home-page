// cookieUtils.js
export function setCookie(name, value, days) {
  var expires = "";
  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  // 序列化对象为JSON字符串
  document.cookie = name + "=" + encodeURIComponent(JSON.stringify(value)) + expires + "; path=/";
}
  
export function getCookie(name) {
  try {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return JSON.parse(decodeURIComponent(c.substring(nameEQ.length, c.length)));
      }
    }
  } catch (e) {
    console.warn('读取 cookie 失败:', name, e);
  }
  return null;
}
  
export function eraseCookie(name) {   
  document.cookie = name + '=; Max-Age=-99999999; path=/';  
}