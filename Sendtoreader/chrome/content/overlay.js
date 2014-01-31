var sendtoreader = 
{
	prefs           : Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.sendtoreader."),
	myLoginManager  : Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager),
	alertService    : null,
	username        : null,
	password        : null,
	strings         : null,
	alertDisabled   : null,
	apiSendURL      : "https://sendtoreader.com/api/send/",
	apiCheckLogin   : "https://sendtoreader.com/api/checklogin/",
	pageInstalled   : "http://sendtoreader.com/add-ons/firefox/installation-complete/",
	hostname        : "http://www.sendtoreader.com",
	loginURL        : "http://sendtoreader.com/wp-login.php",
	httprealm       : null,
	version         : '1.6',
	toolbar_buttons : [ "sendtoreader-send-button" ],

	/**
	 * Loading, initialization. Executes on FF startup.
	 */
	onLoad: function() 
	{
		var timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);	
		
		this.initialized = true;
		this.strings = document.getElementById("sendtoreader-strings");
		
		// load version number
		var installed_version = this.prefs.getCharPref( "version" );
		var installationComplete = this.prefs.getBoolPref( "installationComplete" );
		
		if( !installationComplete )
		{
			// try to install our buttons
			this.install_toolbar_buttons({buttons: this.toolbar_buttons});
			
			// after a short delay display the "installation complete" page
			timer.initWithCallback( function(){
				gBrowser.selectedTab = gBrowser.addTab(sendtoreader.pageInstalled);
				}, 1500, Components.interfaces.nsITimer.TYPE_ONE_SHOT);

			// installation is complete, so save the new state of the extension in appropriate variables
			this.prefs.setBoolPref('installationComplete', true);
			this.prefs.setCharPref('version', this.version);
		}
		
        else if( installed_version !== this.version ) // First run after update
		{
            this.install_toolbar_buttons({buttons: this.toolbar_buttons});
            this.prefs.setCharPref('version', this.version);
        }
	},
	
	/**
	 * Attempt to install the given toolbar buttons
	 */
    install_toolbar_buttons: function( options )
	{
		var insert_before     = typeof(options.insert_before) === 'undefined' ? 'urlbar-container' : options.insert_before;
		var nav_bar           = document.getElementById('nav-bar');
		var current_set_array = nav_bar.currentSet.split(',');
		var new_set;

        // Install all the buttons one by one
        for(var button_index in options.buttons)
		{
            if(options.buttons.hasOwnProperty(button_index))
			{
                var button       = options.buttons[button_index],
                    insert_index = current_set_array.indexOf(insert_before);

                // Only install the button if it's not already in the set
                if(current_set_array.indexOf(button) === -1)
				{
                    current_set_array.splice(insert_index, 0, button);
                }
            }
        }

        // Set the toolbar to the current set
        new_set = current_set_array.join(",");
        nav_bar.setAttribute('currentset', new_set);
        nav_bar.currentSet = new_set;
        document.persist("nav-bar", "currentset");
        //nav_bar.ownerDocument.persist(nav_bar.id, 'currentset');
        BrowserToolboxCustomizeDone(true);
    },

	/**
	 * refreshInformation - Save new password 
	 * @param string new password
	 */
	refreshInformation: function( password ){
		try{
			if( password == null ){
				password = this.password;
			}
			nsLoginInfo = new Components.Constructor( "@mozilla.org/login-manager/loginInfo;1",  Components.interfaces.nsILoginInfo,  "init" );  
			loginInfo = new nsLoginInfo( this.hostname,  this.loginURL, null,  this.username, password, 'username', 'password' );  
			this.updateLoginInfo( loginInfo, this.username, password );
	    } 
		catch(e){
			alert(e);
		}
	},
	
	
	/**
	 * updateLoginInfo - Update stored username/password pair
	 * @param string new password
	 */
	updateLoginInfo: function( loginInfo, username, password){
		// if already exists modify myLoginManager.modifyLogin(oldLogin, newLogin)
		existingLogin = this.getLoginInfoForUsername( username ); 
		if( existingLogin == null && password != ""){
			this.myLoginManager.addLogin( loginInfo );
		} 
		else if( password == "" && existingLogin != null ){
			this.myLoginManager.removeLogin( existingLogin );
		}
		else if( existingLogin != null ){
			this.myLoginManager.removeLogin(existingLogin);
			this.myLoginManager.addLogin( loginInfo );
		}
	},
	
	
	
	/**
	 * getLoginInfoForUsername - load password from the password manager for the given username
	 * @param string username
	 */
	getLoginInfoForUsername: function( username )
	{
		try{
			logins = this.myLoginManager.findLogins({}, this.hostname, this.loginURL, this.httprealm);
			for (i=0; i< logins.length; i++){
				if (logins[i].username == username){
					return logins[i];
				}
			}
			return null;
		} 
		catch(e){ 
			alert(e);
		}		
	},
	
	
	
	/** 
	 * _sendAlert : helper function which we can redefine 
	 *              in case the default notification interface does not working
	 */
	_sendAlert:function()
	{
		try 
		{
			Components.classes["@mozilla.org/alerts-service;1"].getService(Components.interfaces.nsIAlertsService)
					.showAlertNotification.apply(arguments);
		}
		catch(e) 
		{
			var image = null;
  			var win = Components.classes['@mozilla.org/embedcomp/window-watcher;1'].
                      getService(Components.interfaces.nsIWindowWatcher).
                      openWindow(null, 'chrome://global/content/alerts/alert.xul',
                                  '_blank', 'chrome,titlebar=no,popup=yes', null);
			win.arguments = [image, arguments[1], arguments[2], false, ''];/**/
		};
 	},
	

	/**
	 * sendAlert - Shows the given notification
	 * @param Notification message: name of the string variable in locale/overlay.properties
	 */
	sendAlert:function( alert_message, icon )
	{
		if( this.alertDisabled == true )
			return;
			
		//choose an icon
		icon = "chrome://sendtoreader/skin/" + icon + ".png"; 
		// show up the alert
		this._sendAlert( icon, this.strings.getString('alert_Title'), this.strings.getString(alert_message) );  
	},	

	/**
	 * startup - Load login details
	 */
	startup: function()
	{
		try{
			this.prefs.QueryInterface( Components.interfaces.nsIPrefBranch2 );
			this.prefs.addObserver("", this, false);

			this.username = this.prefs.getCharPref( "username" ).toLowerCase();
			loginInfo = this.getLoginInfoForUsername( this.username );
			if ( loginInfo != null){
				this.password = loginInfo.password;
				// if options pannel is opened, set password
				passwordCtrl = document.getElementById("passwordCtrl");
				if (passwordCtrl !== undefined && passwordCtrl != null){
					document.getElementById("passwordCtrl").value = loginInfo.password;
				}
			}
		}
		catch(e){	
			this.sendAlert( 'alert_Settings', 'delete' );
			return false;
		}
		if( !this.username || !this.password ){
			this.sendAlert( 'alert_Settings', 'delete' );
			return false;
		}
		this.alertDisabled = this.prefs.getBoolPref( "alertDisabled" );
		this.refreshInformation();  
		return true;
	}, 

	
	/**
	 * sendURL - Sends the given URL to sendtoreader.com's API for processing
	 * @param URL of the page to be sent to Kindle
	 * @param Title of the page 
	 * @param Text to be sent to Kindle 
	 */
	sendURL:function( url, title, text)
	{
		try
		{
			var formData = new FormData();
			formData.append( "username", this.username );
			formData.append( "password", this.password );
//			formData.append( "url", encodeURIComponent(url) );
			formData.append( "url", url );
			if ( title != null)
				formData.append( "title", encodeURIComponent(title) );
			http = new XMLHttpRequest();
			http.onreadystatechange = function (aEvt) 
			{
				if (http.readyState == 4) 
				{
					//this.apiResponse = http.responseText;
					if( http.status == 200 )
						sendtoreader.sendAlert( 'alert_Success', 'tick' );
					else if( http.status == 401 )
						sendtoreader.sendAlert( 'alert_Ratelimit', 'exclamation' );
					else if( http.status == 403 )
						sendtoreader.sendAlert( 'alert_Wronglogin', 'delete' );
					else if( http.status == 406 )
						sendtoreader.sendAlert( 'alert_Error', 'exclamation' );
					else if( http.status == 500 )
						sendtoreader.sendAlert( 'alert_Servererror', 'delete' );				
					else
						sendtoreader.sendAlert( 'alert_Servererror', 'delete' );				
				}
			};

			http.open( "POST", sendtoreader.apiSendURL, true );	 // send asynchronously
			//http.setRequestHeader( "Content-type", "application/x-www-form-urlencoded" );
			http.send( formData );
		}
		catch(e)
		{	
		}
	},
	

	/** 
	 * It's time to perform the main action - send web page 	
	 * @param URL to send
	 * @param Title of the page
	 */
	runSender: function( url, title )
	{	
		if( this.startup() == true ){
			// Alert user about the action and send the page.
			this.sendAlert( 'alert_Processing', 'information' );
			this.sendURL( url, null, null ); // title and text are reserved for next versions	
		}
	},
	
	
	/**
	 * Event handler for menu item
	 */
	onMenuItemCommand: function(e) 
	{
			// Make sure there is a page to send
		if (!gContextMenu) 
		{ 
			this.sendAlert( 'alert_Nothingtosend', 'exclamation' );
			return;
		}	

		// If we click on a link inside page text, process that link.
		if (gContextMenu.onLink)
			url = gContextMenu.link.href;
		// Otherwise, send the current page (get its URL from the browser address bar)
		else 
		{
			url = window.top.getBrowser().selectedBrowser.contentWindow.location.href;
		}
		
		// no javascript urls please
		if( url.indexOf('javascript') == 0 || url.indexOf('mailto') == 0 || url.indexOf('about:blank') != -1)
		{
			url = window.top.getBrowser().selectedBrowser.contentWindow.location.href;
		}
		
		this.runSender( url, '' );
	},

	
	/**
	 * Sendtoreader button's event handler. Simply call the menu item's handler here.
	 */
	onToolbarButtonCommand: function(e) 
	{
		title = '';
		url = window.top.getBrowser().selectedBrowser.contentWindow.location.href;
		title = content.document.title;
		
		if( (url.indexOf('about:blank') != -1) || (url == "") ) 
		{ 
			this.sendAlert( 'alert_Nothingtosend', 'exclamation' );
			return;
		}	
		
		this.runSender( url, title );
	}
};

window.addEventListener("load", function () { sendtoreader.onLoad(); }, false);
