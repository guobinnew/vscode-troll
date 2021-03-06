// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const crc32 = require('./libs/crc32');
const parse5 = require('./libs/parse5/lib/index');
const exec = require('child_process').exec;

function openURL(url) {
  let opener
  switch (process.platform) {
    case 'darwin':
      opener = 'open'
      break
    case 'win32':
      opener = 'start'
			break
		case 'linux':
			opener = 'xdg-open'
			break
    default:
			opener = 'default'
      break
	}
	
	if (opener === 'default') {
		vscode.env.openExternal(vscode.Uri.parse(url))
	} else {
		exec(`${opener} "${url.replace(/"/g, '\\\"')}"`)
	}
}

const panelMaps = new Map()
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
	// 错误码在400-600之间的，默认弹出错误提示
	if (typeof result == 'object' && result.code && result.code >= 400 && result.code < 600) {
			vscode.window.showErrorMessage(result.message || '发生未知错误！')
	}
	panel.webview.postMessage({cmd: 'vscodeCallback', cbid: message.cbid, data: result})
}

/**
 * 
 * @param {*} path 
 */
function readVue(uri) {
	let res = {
		code: '',
		crc: 0
	}
	let filepath = uri.fsPath || uri.path
	res.script = fs.readFileSync(filepath, 'utf-8')
	const document = parse5.parseFragment(res.script, {sourceCodeLocationInfo: true})
  res.sections = []
	for(let child of document.childNodes){
		if (child.tagName === 'template') {
			res.code = res.script.substring(child.sourceCodeLocation.startOffset, child.sourceCodeLocation.endOffset)
			res.crc = crc32.str(res.code)
		} else {
			// 缓存其余部分
			res.sections.push(res.script.substring(child.sourceCodeLocation.startOffset, child.sourceCodeLocation.endOffset))
		}
	}

	if(res.code === '') {
		vscode.window.showErrorMessage('Error in file(.vue) format: missing <template>')
	}

	return res
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
	openurl(context, message) {
		if (message.info === '') {
			vscode.window.showErrorMessage('Uri is invalid!')
			return
		}
		openURL(message.info)
	},
	opendoc(context, message) {
		vscode.window.showTextDocument(context.uri)
	},
	loadfile(context, message) {
		let res = readVue(context.uri)
		if (panelMaps.has(context.uri.path)) {
			const panelcontext = panelMaps.get(context.uri.path)
			panelcontext.lastcrc = res.crc
		}
		invokeCallback(context.panel, message, {code: 0, result: {
			code: res.code,
			crc: res.crc
		}})
		vscode.window.showInformationMessage('Load file successfully!')
	},
	savefile(context, message) {
		let res = readVue(context.uri)

		// 写入文件
		const writefile = () => {
			// 只替换<template>部分，其余部分保持原样
			let source = message.info.code
			for (let i=0; i<res.sections.length; i++) {
				source += '\n' + res.sections[i]
			}
			// 写入新代码
			let filepath = context.uri.fsPath || context.uri.path
			fs.writeFileSync(filepath, source, 'utf-8')
			// 计算新CRC
			let newcrc = crc32(message.info.code)
			if (panelMaps.has(context.uri.path)) {
				const panelcontext = panelMaps.get(context.uri.path)
				panelcontext.lastcrc = newcrc
			}

			invokeCallback(context.panel, message, {
				code: 0,
				result: res.crc
			})
			vscode.window.showInformationMessage('Write file successfully!')
		}

		if (res.crc !== message.info.crc && message.info.forced !== true) {
			vscode.window.showInformationMessage('Vue template have been modified, whether to force overwrite it？', {modal: true}, 'Yes').then((result) => {
				if (result === 'Yes') {
					writefile()
				} 
			});
			return
		} 
		writefile()
	},
}
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, extension "Troll" is now active!')

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
			if (messageHandlers[message.cmd]) {
					messageHandlers[message.cmd](panelctx, message)
			} else {
				vscode.window.showErrorMessage(`Can't find ${message.cmd} callback!`)
			}
		}, null, context.subscriptions)

		panelMaps.set(uri.path, panelctx)
		panelctx.panel.onDidChangeViewState(
			(e) => {
				if (panelctx.panel.visible){
					// 检查CRC是否改变
					let res = readVue(panelctx.uri)
					if (res.crc !== panelctx.lastcrc) {
						// CRC检查失败
						vscode.window.showWarningMessage('Vue file have been modified, please reload file!')
						return
					}
				}
			},
			null,
      context.subscriptions
		)
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
	panelMaps.clear()
}

module.exports = {
	activate,
	deactivate
}
