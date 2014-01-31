sendtoreader.onFirefoxLoad = function(event) 
{
  document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", 
														function (e){ sendtoreader.showFirefoxContextMenu(e); }, false);
};


sendtoreader.showFirefoxContextMenu = function(event) 
{
  // show or hide the menuitem based on what the context menu is on
  document.getElementById("context-sendtoreader").hidden = gContextMenu.onImage;
};


window.addEventListener("load", function () { sendtoreader.onFirefoxLoad(); }, false);
