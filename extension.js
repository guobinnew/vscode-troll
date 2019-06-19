// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * 
 * @param {*} context 
 * @param {*} templatePath 
 */
function getWebViewContent(context, templatePath) {
	const resourcePath = path.join(context.extensionPath, templatePath)
	const dirPath = path.dirname(resourcePath)
	let html = fs.readFileSync(resourcePath, 'utf-8')
	// vscode不支持直接加载本地资源，需要替换成其专有路径格式，这里只是简单的将样式和JS的路径替换
	html = html.replace(/(<link.+?href="|<script.+?src="|<img.+?src=")(.+?)"/g, (m, $1, $2) => {
			return $1 + vscode.Uri.file(path.join(dirPath, $2)).with({ scheme: 'vscode-resource' }).toString() + '"'
	})
	return html
}

/**
 * 执行回调函数
 * @param {*} panel 
 * @param {*} message 
 * @param {*} resp 
 */
function invokeCallback(panel, message, result) {
	console.log('回调消息：', result)
	// 错误码在400-600之间的，默认弹出错误提示
	if (typeof result == 'object' && result.code && result.code >= 400 && result.code < 600) {
			vscode.window.showErrorMessage(result.message || '发生未知错误！')
	}
	panel.webview.postMessage({cmd: 'vscodeCallback', cbid: message.cbid, data: result})
}

/**
 * 存放所有消息回调函数，根据 message.cmd 来决定调用哪个方法
 */
const messageHandlers = {
	// 弹出提示
	alert(context, message) {
		vscode.window.showInformationMessage(message.info)
	},
	// 显示错误提示
	error(context, message) {
		vscode.window.showErrorMessage(message.info)
	},
	loadfile(context, message) {
		let vue = fs.readFileSync(context.uri.path, 'utf-8')
		invokeCallback(context.panel, message, {code: 0, content: vue})
	}
}

const panelMaps = new Map()
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "troll" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.troll', function (uri) {
		// The code you place here will be executed every time your command is executed
		if (panelMaps.has(uri.path)) {
			// 激活panel
			let panelcontext = panelMaps.get(uri.path)
			panelcontext.panel.reveal()
			return
		}

		let panelctx = {
			uri: uri,
			filename: path.basename(uri.path, '.vue')
		}

		// Display a message box to the user
		// vscode.window.showInformationMessage('Hello World!');
		panelctx.panel = vscode.window.createWebviewPanel(
			'troll', // viewType
			panelctx.filename + '.troll', // 视图标题
			vscode.ViewColumn.One, // 显示在编辑器的哪个部位
			{
					enableScripts: true, // 启用JS，默认禁用
					retainContextWhenHidden: true, // webview被隐藏时保持状态，避免被重置
			}
		);
		panelctx.panel.webview.html = getWebViewContent(context, 'static/index.html')
		panelctx.panel.webview.onDidReceiveMessage((message) => {
			console.log('-----', message)
			if (messageHandlers[message.cmd]) {
					messageHandlers[message.cmd](panelctx, message)
			} else {
				vscode.window.showErrorMessage(`未找到名为 ${message.cmd} 回调方法!`)
			}
		}, null, context.subscriptions)

		panelMaps.set(uri.path, panelctx.panel)
		panelctx.panel.onDidDispose(
			() => {
				// When the panel is closed, cancel any future updates to the webview content
				panelMaps.delete(panelctx.uri.path)
			},
			null,
			context.subscriptions
		)
	})
	context.subscriptions.push(disposable)
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}

module.exports = {
	activate,
	deactivate
}
