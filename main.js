// Modules to control application life and create native browser window
const electron = require("electron");
const { app, BrowserWindow, ipcMain, session, systemPreferences, Menu, dialog } = require('electron');
const serve = require('electron-serve');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

const isDev = true;

const loadURL = serve({scheme:"moderndeck",directory:'ModernDeck'});

app.setAppUserModelId("com.dangeredwolf.ModernDeck");


const {autoUpdater} = require("electron-updater");
var updating = false;
var installLater = false;
var showWarning = false;

autoUpdater.setFeedURL({
	"owner": "dangeredwolf",
	"repo": "ModernDeck",
	"provider": "github"
});

function makeLoginWindow(url) {

	var originalUrl = url;

	var loginWindow = new BrowserWindow({
		width: 710,
		height: 490,
		webPreferences: {
			nodeIntegration: true
		},
		scrollBounce:true,
		autoHideMenuBar:true,
		icon:__dirname+"ModernDeck/sources/favicon.ico",
	});

	loginWindow.on('closed', function () {
		loginWindow = null;
	});

	loginWindow.webContents.on("will-navigate", function(event, url) {
		console.log(url);
		const { shell } = electron;
		if (url.indexOf("https://tweetdeck.twitter.com") >= 0) {
			mainWindow.loadURL(url);
			loginWindow.close();
			event.preventDefault();
			return;
		}
		if (url.indexOf("https://twitter.com/?logout") >= 0) {
			mainWindow.reload();
			loginWindow.close();
			event.preventDefault();
			return;
		}
		if (url.indexOf("https://twitter.com/logout") >= 0 || url.indexOf("https://twitter.com/login") >= 0) {
			return;
		}
		if (url.indexOf("https://twitter.com/account") >= 0 || url.indexOf("https://twitter.com/signup") >= 0) {
			shell.openExternal(url);
			event.preventDefault();
			return;
		}

		event.preventDefault();
	});

	loginWindow.webContents.on("did-navigate-in-page", function(event, url) {
		console.log(url);
		if (url.indexOf("https://tweetdeck.twitter.com") >= 0) {
			mainWindow.loadURL(url);
			loginWindow.close();
			event.preventDefault();
			return;
		}
		if (url.indexOf("https://twitter.com/logout") >= 0 || url.indexOf("https://twitter.com/login") >= 0) {
			return;
		}
		loginWindow.loadURL(originalUrl);
	});

	loginWindow.loadURL(url);

}

function makeWindow() {

	var display = {};


	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			nodeIntegration: true
		},
		scrollBounce:true,
		autoHideMenuBar:true,
		title:"ModernDeck",
		icon:__dirname+"ModernDeck/sources/favicon.ico",
		frame:false,
		minWidth:400,
		show:false,
		backgroundColor:'#263238'
	});

  var isOnline = true;

  var online = mainWindow.webContents.executeJavaScript("return navigator.onLine",false,function(e){
    isOnline = e;
  })

	if (!isOnline) {
		dialog.showMessageBox(mainWindow,{
			title:"ModernDeck",
			message:"It seems that you aren't connected to the internet. ModernDeck requires an internet connection to function.",
			type:"error",
			buttons:["Retry","Close"]
		},function(response){
			if (response === 0) {
				mainWindow.destroy();
				mainWindow = null;
				makeWindow();
			} else if (response === 1) {
				mainWindow.destroy();
				mainWindow = null;
			}
		});
		return;
	}

	mainWindow.show();


	mainWindow.on('page-title-updated', function(event,url) {
		event.preventDefault();
	})


	mainWindow.webContents.on('dom-ready', function(event, url) {
		mainWindow.webContents.executeJavaScript('\
			document.querySelector("html").classList.add("mtd-app");\
			var injurl = document.createElement("div");\
			injurl.setAttribute("type","moderndeck://ModernDeck/");\
			injurl.id = "MTDURLExchange";\
			document.head.appendChild(injurl);\
			\
			var InjectScript2 = document.createElement("script");\
			InjectScript2.src = "https://cdn.ravenjs.com/3.19.1/raven.min.js";\
			InjectScript2.type = "text/javascript";\
			document.head.appendChild(InjectScript2);\
			\
			var injStyles = document.createElement("link");\
			injStyles.rel = "stylesheet";\
			injStyles.href = "moderndeck://ModernDeck/sources/moderndeck.css";\
			document.head.appendChild(injStyles);\
			\
			var InjectScript = document.createElement("script");\
			InjectScript.src = "moderndeck://ModernDeck/sources/MTDinject.js";\
			InjectScript.type = "text/javascript";\
			document.head.appendChild(InjectScript);\
			');
	});

	mainWindow.webContents.on('did-finish-load', (event, url) => {
		// mainWindow.webContents.executeJavaScript('\
		//	 try{setTimeout(function(){document.querySelector("header.app-header").setAttribute("style","");},1000);}catch(e){};\
		//	 ');
	});

	mainWindow.webContents.session.webRequest.onHeadersReceived(
		{urls:["https://tweetdeck.twitter.com/*","https://twitter.com/i/cards/*"]},
		(details, callback) => {
			var foo = details.responseHeaders;
			foo["content-security-policy"] =[
				"default-src 'self'; connect-src * moderndeck:; font-src https: data: * moderndeck:; frame-src https: moderndeck:; frame-ancestors 'self' https: moderndeck:; img-src https: data: moderndeck:; media-src * moderndeck:; object-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sentry.io https://cdn.jsdelivr.net https://ajax.googleapis.com moderndeck: https://cdn.ravenjs.com/ https://*.twitter.com https://*.twimg.com https://rawgit.com https://*.rawgit.com https://ssl.google-analytics.com https://api-ssl.bitly.com; style-src 'self' 'unsafe-inline' 'unsafe-eval' https: moderndeck:;"];
			callback({ responseHeaders: foo});
		}
	);

	mainWindow.webContents.session.webRequest.onBeforeRequest({urls:["https://ton.twimg.com/*"]},function(details,callback) {

		if (details.url.indexOf(".css") > -1 && (details.url.indexOf("bundle") > -1 && details.url.indexOf("dist") > -1)) {
			callback({cancel:true});
			return;
		}

		callback({cancel:false});
	});

	mainWindow.loadURL("https://tweetdeck.twitter.com");
	// Open the DevTools.
	// mainWindow.webContents.openDevTools();

	mainWindow.webContents.on("will-navigate", function(event, url) {
		const { shell } = electron;
		if (url.indexOf("https://tweetdeck.twitter.com") < 0) {
			event.preventDefault();
			console.log(url);
			if (url.indexOf("https://twitter.com/login") >= 0 || url.indexOf("https://twitter.com/logout") >= 0) {
				makeLoginWindow(url);
			} else {
				shell.openExternal(url);
			}
		}
	});

	mainWindow.webContents.on("new-window", function(event, url) {
		const { shell } = electron;
		event.preventDefault();
		shell.openExternal(url);
	});

	mainWindow.webContents.on("context-menu", function(event, params) {
		console.log(params);
		mainWindow.send("context-menu", params);
	});

	ipcMain.on("copy",function(event){
		mainWindow.webContents.copy();
	});
	ipcMain.on("cut",function(event){
		mainWindow.webContents.cut();
	});
	ipcMain.on("paste",function(event){
		mainWindow.webContents.paste();
	});
	ipcMain.on("delete",function(event){
		mainWindow.webContents.delete();
	});
	ipcMain.on("selectAll",function(event){
		mainWindow.webContents.selectAll();
	});
	ipcMain.on("undo",function(event){
		mainWindow.webContents.undo();
	});
	ipcMain.on("redo",function(event){
		mainWindow.webContents.redo();
	});
	ipcMain.on("copyImage",function(event,arg){
		mainWindow.webContents.copyImageAt(arg.x,arg.y);
	});
	ipcMain.on("inspectElement",function(event,arg){
		mainWindow.webContents.inspectElement(arg.x,arg.y);
	});

	// Emitted when the window is closed.
	mainWindow.on('closed', function () {
		mainWindow = null;
	});

	mainWindow.on('maximize', function () {
		mainWindow.webContents.executeJavaScript('\
			document.querySelector("html").classList.add("mtd-maximized");\
			document.querySelector(".windowcontrol.max").innerHTML = "&#xE3E0";\
			');
	});

	mainWindow.on('unmaximize', function () {
		mainWindow.webContents.executeJavaScript('\
			document.querySelector("html").classList.remove("mtd-maximized");\
			document.querySelector(".windowcontrol.max").innerHTML = "&#xE3C6";\
			');
	});
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', makeWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
	if (mainWindow === null) makeWindow()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
