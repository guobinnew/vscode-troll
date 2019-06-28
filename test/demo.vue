<template>
  <div class="frontend" v-resize="onResize">
    <Layout class="layout-con">
      <Sider collapsible="" hide-trigger="" :collapsed-width="36" v-model="isCollapsed">
        <Menu active-name="search" theme="dark" width="auto" :class="menuitemClasses" @on-select="selectNavMenu">
          <MenuItem name="search">
          <Tooltip content="Search element" placement="right">
            <Icon type="md-search"></icon>
          </Tooltip>
          </MenuItem>
          <MenuItem name="document">
          <Tooltip content="Open Text Editor" placement="right">
            <Icon type="md-list"></Icon>
          </Tooltip>
          </MenuItem>
          <MenuItem name="load">
          <Tooltip content="Load Vue file" placement="right">
            <Icon type="md-open"></Icon>
          </Tooltip>
          </MenuItem>
          <MenuItem name="save">
          <Tooltip content="Write Vue file" placement="right">
            <Icon type="md-code-download"></Icon>
          </Tooltip>
          </MenuItem>
          <MenuItem name="debug" v-if="scene.debug">
          <Tooltip content="Debug" placement="right">
            <Icon type="md-create"></Icon>
          </Tooltip>
          </MenuItem>
          <MenuItem name="about">
          <Tooltip content="About" placement="right">
            <Icon type="md-at"></Icon>
          </Tooltip>
          </MenuItem>
        </Menu>
      </Sider>
      <Layout>
        <Content>
          <Split v-model="split.ratio" :min="splitMin" :max="splitMax">
            <div slot="left" class="split-pane">
                <CheckboxGroup class="check-libs" v-model="components.filters">
                  <span style="margin: 0 8px 0 0;">UI</span>
                  <Poptip v-for="item in components.libs" word-wrap="" trigger="hover" placement="bottom-start" width="200" :content="item.desc">
                    <Checkbox :label="item.category" :disabled="item.category === 'html5'"><span>{{item.title}}</span></Checkbox>
                  </Poptip>
                </CheckboxGroup>  
              <Input v-model="components.key" suffix="md-search" placeholder="Search" style="width: 100%; padding: 0 4px;" @on-enter="searchComponents"></Input>
              <Scroll :height="size.scrollHeight">
                <div class="search-item">
                  <div class="search-group"><span>Custom</span></div>
                  <Option v-for="option in components.vuedefs.tags" :value="option.name" :key="option.name">
                    <Poptip word-wrap="" trigger="hover" placement="right" width="200" :content="option.desc">
                      <div class="poptip-title" slot="title">{{ option.title }}</div><span class="search-item-title">{{ option.name }}</span>
                    </Poptip>
                    <Button class="search-item-add" type="primary" ghost="" icon="md-add" size="small" @click="addCustomComponent(option.name)"></Button>
                  </Option>
                </div>
                <div class="search-item" v-for="item in components.searchResult">
                  <div class="search-group"><span>{{ item.title }}</span></div>
                  <Option v-for="option in item.elements" :value="option.name" :key="option.name">
                    <Poptip word-wrap="" trigger="hover" placement="right" width="200" :content="option.desc">
                      <div class="poptip-title" slot="title" v-if="vscodeExtMode">{{ option.title }}<Button style="float: right;" type="text" icon="md-help-circle" size="small" @click="openBrowser(option.help)"></Button></div>
                      <div class="poptip-title" slot="title" v-else="">{{ option.title }}<a :href="option.help" target="_blank">
                          <Icon type="md-help-circle"></Icon>
                        </a></div><span class="search-item-title">{{ option.name }}</span>
                    </Poptip>
                    <Button class="search-item-add" type="primary" ghost="" icon="md-add" size="small" @click="addComponent(item.category, option.name)"></Button>
                  </Option>
                </div>
              </Scroll>
            </div>
            <div slot="right" class="split-pane">
              <div id="scene"></div>
            </div>
          </Split>
        </Content>
      </Layout>
    </Layout>
    <div class="editor-button">
      <Tooltip placement="bottom" content="Zoom Out" :delay="1000"><Button shape="circle" icon="md-remove" @click="zoomOut"></Button></Tooltip>
      <Tooltip placement="bottom" content="Zoom In" :delay="1000"><Button shape="circle" icon="md-add" @click="zoomIn"></Button></Tooltip>
      <Tooltip placement="bottom" content="Reset Canvas" :delay="1000"><Button shape="circle" icon="md-refresh" @click="reset"></Button></Tooltip>
      <Tooltip placement="bottom" content="Undo" :delay="1000"><Button shape="circle" icon="md-undo" :disabled="!hasUndo" @click="undo"></Button></Tooltip>
      <Tooltip placement="bottom-end" content="Redo" :delay="1000"><Button shape="circle" icon="md-redo" :disabled="!hasRedo" @click="redo"></Button></Tooltip>
    </div>
    <Drawer title="Script Editor" width="1024" :closable="true" :mask-closable="false" v-model="scriptEditor.visible">
      <ButtonGroup class="code-button"><Button icon="md-create" @click="updateDebugScript">Update</Button></ButtonGroup>
      <codemirror ref="code" v-model="scriptEditor.code" :options="scriptEditor.options"></codemirror>
    </Drawer>
    <Modal title="Add Custom Element" v-model="dialogs.customElement.visible" :styles="{top: '20px'}" :mask-closable="false">
      <Form ref="customElement" :model="dialogs.customElement.form" :rules="dialogs.customElement.rules">
        <FormItem prop="tagName"><Input type="text" v-model="dialogs.customElement.form.tagName" placeholder="TagName"></Input>
          <Icon type="ios-code" slot="prepend"></Icon>
        </FormItem>
      </Form>
      <div slot="footer"><Button type="primary" @click="addCustomElement">Add</Button><Button style="margin-left: 8px" @click="closeCustomElement">Cancel</Button></div>
    </Modal>
    <Modal title="Edit Element" v-model="dialogs.editElement.visible" :styles="{top: '20px'}" :width="800" :mask-closable="false">
      <Form ref="editElement" :model="dialogs.editElement.form" :rules="dialogs.editElement.rules" :label-width="80" inline="">
        <FormItem label="Name" prop="tagName"><Input type="text" size="small" v-model="dialogs.editElement.form.tagName" placeholder="TagName" :readonly="true"></Input></FormItem>
        <FormItem label="Category" prop="tagCategory"><Input type="text" size="small" v-model="dialogs.editElement.form.tagCategory" placeholder="Category" :readonly="true"></Input></FormItem>
      </Form>
      <div class="divider-horizontal"></div>
      <Row>
        <Col span="8">
        <Scroll>
          <div class="search-group"><span>Properties</span><Button class="search-item-add" type="primary" icon="md-add" size="small" @click="addCustomAttribute"></Button></div>
          <CellGroup @on-click="handleSelectAttribute">
            <Cell v-for="prop in dialogs.editElement.form.props" :title="prop.key" :name="prop.key" :selected="prop.selected">
              <Badge slot="icon" :status="prop.required ? 'error' : 'default'"><Button slot="extra" v-show="prop.selected" type="error" ghost="" class="search-item-add" icon="md-trash" size="small" @click="clearAttribute(prop.key)"></Button></Badge>
            </Cell>
          </CellGroup>
          <div class="search-group"><span>Events</span><Button class="search-item-add" type="primary" icon="md-add" size="small" @click="addCustomEvent"></Button></div>
          <CellGroup @on-click="handleSelectEvent">
            <Cell v-for="prop in dialogs.editElement.form.events" :title="prop.key" :name="prop.key" :selected="prop.selected">
              <Badge slot="icon" :status="prop.required ? 'error' : 'default'"><Button slot="extra" v-show="prop.selected" type="error" ghost="" class="search-item-add" icon="md-trash" size="small" @click="clearEvent(prop.key)"></Button></Badge>
            </Cell>
          </CellGroup>
        </Scroll>
        </Col>
        <Col span="16">
        <Form ref="editElementAttribute" :model="dialogs.editElement.form.current" :label-width="80">
          <FormItem label="type">
            <Tag color="error">{{dialogs.editElement.form.current.type}}</Tag>
          </FormItem>
          <FormItem label="key"><Input type="text" style="display:inline;" v-model="dialogs.editElement.form.current.key" @on-change="handleChangePropertyName" :readonly="true"></Input></FormItem>
          <FormItem label="v-bind">
            <i-switch size="large" v-model="dialogs.editElement.form.current.bound" :disabled="!dialogs.editElement.form.current.canBind || dialogs.editElement.form.current.type === 'event'"><span slot="open">On</span><span slot="close">Off</span></i-switch>
          </FormItem>
          <FormItem label="value" prop="propValue"><Input type="text" size="small" :maxlength="60" v-model="dialogs.editElement.form.current.value" :placeholder="dialogs.editElement.form.current.default" @on-change="handleChangePropertyValue"></Input></FormItem>
          <FormItem label="data-type" prop="propDataType">
            <Tag color="success" v-for="item in dialogs.editElement.form.current.datatype">{{item}}</Tag>
          </Formitem>
          <FormItem>
            <Alert>
              <template slot="desc">
                <p>{{dialogs.editElement.form.current.desc}}</p>
                <p v-if="dialogs.editElement.form.current.values.length > 0">可选值为<Tag color="warning" v-for="val in dialogs.editElement.form.current.values">{{ val }}</Tag>
                </p>
              </template>
            </Alert>
          </FormItem>
        </Form>
        </Col>
      </Row>
      <div slot="footer"><Button type="primary" @click="updateElement">Save</Button><Button style="margin-left: 8px" @click="closeEditElement">Cancel</Button></div>
    </Modal>
    <Modal :title="dialogs.editText.title" v-model="dialogs.editText.visible" :styles="{top: '20px'}" :mask-closable="false">
      <Form ref="editText" :model="dialogs.editText.form">
        <FormItem prop="text"><Input type="textarea" :autosize="true" v-model="dialogs.editText.form.text" placeholder="Please enter text"></Input></FormItem>
      </Form>
      <div slot="footer"><Button type="primary" @click="updateText">Save</Button><Button style="margin-left: 8px" @click="closeEditText">Cancel</Button></div>
    </modal>
    <modal :title="dialogs.customProperty.title" v-model="dialogs.customProperty.visible" :mask="false" :styles="{top: '20px'}">
      <Form ref="customProperty" :model="dialogs.customProperty.form" :rules="dialogs.customProperty.rules">
        <FormItem prop="name"><Input type="text" v-model="dialogs.customProperty.form.name" placeholder="name"></Input>
          <Icon type="md-code" slot="prepend"></Icon>
        </FormItem>
      </Form>
      <div slot="footer"><Button type="primary" @click="addCustomProperty">Add</Button><Button style="margin-left: 8px" @click="closeCustomProperty">Cancel</Button></div>
    </modal>
    <Modal v-model="dialogs.about.visible" :styles="{top: '20px'}" title="About">
      <Row>
        <Col span="8">
        <h3>{{dialogs.about.form.title}}</h3>
        <p>
          <Tag color="error">{{dialogs.about.form.version}}</Tag>
        </p>
        </Col>
        <Col span="16">
        <p>{{dialogs.about.form.desc}}</p>
        <p>
          <Tag color="geekblue">Author</Tag>{{dialogs.about.form.author}}
        </p>
        <p>
          <Tag color="geekblue">Email</Tag>{{dialogs.about.form.email}}
        </p>
        </Col>
      </Row>
      <div slot="footer"><Button type="success" size="large" @click="dialogs.about.visible=false">OK</Button></div>
    </Modal>
  </div>
</template>

<style  scoped>
.frontend {
  width: 100%;
  height: 100%;
}

#scene {
  width: 100%;
  height: 100%;
}

.editor-button {
  margin-bottom: 4px;
  position: absolute;
  top: 4px;
  right: 4px;
}

.editor-button button{
  margin-right: 2px;
}

.code-button {
  margin-bottom: 4px;
}

.layout-con {
  height: 100%;
  width: 100%;
}

.ivu-menu-item {
  padding: 8px 0px;
}

.check-libs {
  color: #333;
  text-align: left;
  margin-left: 4px;
}

    .menu-item i{
        transform: translateX(0px);
        transition: font-size .2s ease, transform .2s ease;
        vertical-align: middle;
        font-size: 16px;
    }

    .collapsed-menu i{
        transform: translateX(5px);
        transition: font-size .2s ease .2s, transform .2s ease .2s;
        vertical-align: middle;
        font-size: 20px;
    }

     .search-item{
        padding: 4px 0;
        border-bottom: 1px solid #F6F6F6;
        text-align: left;
    }
    .search-group{
        font-size: 12px;
        padding: 4px 6px;
        text-align: left;
    }
    .search-group span{
        color: #666;
        font-weight: bold;
    }

    .search-item-add {
      float: right;
      margin-top: -3px;
    }

    .split-pane {
      overflow: hidden;
    }

    .ivu-form-item {
      margin-bottom: 8px;
    }

    .ivu-cell {
      padding: 4px 16px;
    }

    .divider-horizontal {
      background-color: #e8eaec;
      display: block;
      height: 1px;
      width: 100%;
      min-width: 100%;
      margin: 4px 0;
      clear: both;
    }

    .poptip-title {
      font-weight: bold;
      font-size: 14px;
    }

    .poptip-title a{
      float: right;
    }

</style>

<script >
  import resize from 'vue-resize-directive'
  import Common from 'orion-common'

  import { codemirror } from 'vue-codemirror'
  import 'codemirror/mode/javascript/javascript'
  import 'codemirror/theme/monokai.css'
  import troll from './troll/index'
  import TEST from './test'
  import UILibs from './ui/zh-CN/index'

  const parse5 = require('parse5')
  const beautify = require('vue-beautify')
  const crc32 = require('crc-32')

  export default {
    props: ["source"],
    directives: {
      resize,
    },
    components: {codemirror},
    data: function () {
      const validateName = (rule, value, callback) => {
        if (!value || value.length === 0) {
          callback(new Error('Please enter name'))
        } else {
          callback()
        }
      }

      return {
        split: {
          ratio: 0.3,
          oldRatio: 0.3,
          minWidth: 300,
          maxWidth: 600,
        },
        isCollapsed: true,
        vscodeExtMode: false,
        size: {
          width: 0,
          height: 0,
          scrollHeight: 0,
        },
        dialogs: {
          customElement: {
            visible: false,
            parent: null,
            form: {
              tagName: ''
            },
            rules: {
              tagName: [
                  { validator: validateName, trigger: 'blur' }
              ]
            }
          },
          editElement: {
            visible: false,
            model: null,
            form: {
              tagName: '',
              tagCategory: '',
              def: null,
              props: [],
              events: [],
              current: null,
              empty: {
                type: 'property',
                key: '',
                value: '',
                datatype: ['string'],
                values: [],
                default: '',
                desc: '',
                custom: true,
                canBind: false,
                required: false,
                bound: false
              }
            }
          },
          editText: {
            visible: false,
            model: null,
            title: 'Edit #Text',
            form: {
              text: ''
            }
          },
          customProperty: {
            visible: false,
            title: '',
            type: 'property',
            form: {
              name: ''
            },
            rules: {
              name: [
                { validator: validateName, trigger: 'blur' }
              ]
            }
          },
          about: {
            visible: false,
            form: {
              version: 'v0.0.17',
              title: 'Troll For Vue',
              desc: 'An visual editor for vue(2.x)',
              author: 'unique',
              email: 'ods_hla@163.com'
            }
          }
        },
        components: {
          filters: [],
          libs: [],
          vuedefs: null,
          key: '',
          searchResult: []
        },
        scene: {
          stage: null,
          debug: false
        },
        scriptEditor: {
          sections: [],
          code: '',
          codecrc: 0,
          options: {
            tabSize: 2,
            mode: 'text/javascript',
            theme: 'monokai',
            lineNumbers: true,
            line: true,
            matchBrackets: true,
            autofocus: true
          },
          visible: false
        }
      };
    },
    computed: {
      hasUndo: function () {
        return this.scene.stage ? this.scene.stage.hasUndo() : false
      },
      hasRedo: function () {
        return this.scene.stage ? this.scene.stage.hasRedo() : false
      },
      menuitemClasses: function () {
        return [
            'menu-item',
            this.isCollapsed ? 'collapsed-menu' : ''
        ]
      },
      splitMin: function () {
        return this.split.minWidth + 'px'
      },
      splitMax: function () {
        return this.split.maxWidth + 'px'
      }
    },
    methods: {
       onResize() {
        this.size.width = this.$el.clientWidth
        this.size.height = this.$el.clientHeight
        this.size.scrollHeight = this.size.height - 80
        this.scene.stage.resize(this.size.width, this.size.height)
      },
      zoomIn () {
        this.scene.stage.zoomIn()
      },
      zoomOut () {
        this.scene.stage.zoomOut()
      },
      reset () {
        this.scene.stage.reset()
      },
      undo () {
        this.scene.stage.undo()
      },
      redo () {
        this.scene.stage.redo()
      },
      loadScript (script) {
        if (script.length === 0) {
          this.scene.stage.clear()
          return
        }
        this.scene.stage.loadFromFile(script)
      },
      openBrowser (url) {
        window.__callVscode__({ cmd: 'openurl', info: url }, (data) => {
        })
      },
      openDocument () {
        window.__callVscode__({ cmd: 'opendoc', info: '' }, (data) => {
        })
      },
      readScript() {
        window.__callVscode__({ cmd: 'loadfile', info: '' }, (data) => {
          this.scriptEditor.code = data.result.code
          this.scriptEditor.codecrc = data.result.crc
          this.loadScript(this.scriptEditor.code || '')
        })
      },
      writeScript () {
        let code = ''
        if (this.scene.stage.exportPug) {
          code = this.scene.stage.saveToFile()
        } else {
          code = beautify(this.scene.stage.saveToFile(), {indent_size: 2, intent_scripts: 'keep'})
        }

        let source = code.slice()
        if (this.scriptEditor.sections.length > 0) {
          for(let i=0; i<this.scriptEditor.sections.length; i++){
			      source += this.scriptEditor.sections[i]
			    } 
        }

        if (this.scene.stage.exportPug) {
          this.scriptEditor.code = source
        } else {
          this.scriptEditor.code = beautify(source, {indent_size: 2, intent_scripts: 'keep'})
        }

         window.__callVscode__({
          cmd: 'savefile', 
          info: {
            code: code,
            crc:  this.scriptEditor.codecrc
          }
        }, (data) => {
          this.scriptEditor.codecrc = data.result
        })
      },
      updateDebugScript () {
        let model = this.scriptEditor.code
        let code = ''
        this.scriptEditor.sections = []
        if (model.length > 0) {
          // 剔除注释
          // model = model.replace(/(?:^|\n|\r)\s*\/\*[\s\S]*?\*\/\s*(?:\r|\n|$)/g, '\n').replace(/(?:^|\n|\r)\s*\/\/.*(?:\r|\n|$)/g, '\n')
          const document = parse5.parseFragment(model, {sourceCodeLocationInfo: true})
          for(let child of document.childNodes){
			      if (child.tagName === 'template') {
			        let props = ''
			        for(let p of child.attrs) {
				       props += ' ' + p.name + (p.value.length > 0 ? `="${p.value}"` : '')
			        }
              code = model.substring(child.sourceCodeLocation.startOffset, child.sourceCodeLocation.endOffset)
		    	  } else {
              // 缓存其余部分
              this.scriptEditor.sections.push(model.substring(child.sourceCodeLocation.startOffset, child.sourceCodeLocation.endOffset))
            }
		      }
	        if(code === '') {
            this.$Notice.error({
              title: 'Parsing file failed',
              desc: 'Error in file(.vue) format: missing template section',
              duration: 30,
              closable: true
            })
            code = '<template></template>'
          }
        }
        this.loadScript(code)
        this.scriptEditor.visible = false
      },
      searchComponents () {
        this.components.searchResult = UILibs.search({
          key: this.components.key,
          filters: this.components.filters
        })
      },
      addComponent (category, tag, parent = null) {
        let sel = parent
        if (!sel) {
          sel = this.scene.stage.selectedElement()
        }
       
        if (!sel) {
          this.$Message.warning({
            content: 'Please select a element first'
          })
        } else {
          this.scene.stage.addElement({
            tagCategory: category,
            tagName: tag
          }, sel)
          sel.expand(true)
          this.scene.stage.refresh()
          this.scene.stage.snapshot()    
        }
      },
      addCustomComponent(name) {
        let sel = this.scene.stage.selectedElement()
        if (!sel) {
          this.$Message.warning({
            content: 'Please select a element first'
          })
        } else {
          if ( name === 'element') {
            this.$refs['customElement'].resetFields()
            this.dialogs.customElement.parent = sel
            this.dialogs.customElement.visible = true
          } else if ( name === 'template') {
            if (sel.tagName() !== 'template') {
              this.scene.stage.addElement({
                fill: '#CDB5CD',
                tagName: 'template',
              } ,sel)
              sel.expand(true)
              this.scene.stage.refresh()
              this.scene.stage.snapshot()
            } else {
              this.$Message.error({
                content: 'Template can not include template'
              })
            }
          } else {
            if ( name === '#text') {
              if (sel.tagName() !== 'template') {
                this.scene.stage.addText({
                text: ''
                }, sel)
              }
              else {
                this.$Message.error({
                  content: 'Template can not include #text'
                })
                return
              }
            } else if ( name === '#comment') {
              this.scene.stage.addComment({
                text: ''
              }, sel)
            }
   
            sel.expand(true)
            this.scene.stage.refresh()
            this.scene.stage.snapshot()
          }
        }
      },
      addCustomElement() {
        this.$refs['customElement'].validate((valid) => {
          if (valid) {
            this.dialogs.customElement.visible = false
            let tagName = this.dialogs.customElement.form.tagName
            this.addComponent('custom', tagName, this.dialogs.customElement.parent)
            this.dialogs.customElement.parent = null         
          }
        })
      },
      closeCustomElement () {
        this.dialogs.customElement.visible = false
        this.dialogs.customElement.parent = null 
      },
      updateElement () {
        this.dialogs.editElement.visible = false
        // 更新元素Category
        const elem = this.dialogs.editElement.model
        elem.config.tagCategory = this.dialogs.editElement.form.tagCategory
        // 更新元素属性值
        elem.clearProperty()

        for(let p of this.dialogs.editElement.form.props) {
          if (p.selected) {
            elem.addProperty({
              name: (p.bound ? p.prefix : '') + p.key,
              value: p.value
            })
          }
        }

         for(let evt of this.dialogs.editElement.form.events) {
          if (evt.selected) {
            elem.addProperty({
              name: (evt.bound ? evt.prefix : '') + evt.key,
              value: evt.value
            })
          }
        }

        elem.adjust({
          bubble: true
        })
        elem.refresh()
        this.dialogs.editElement.model = null
        this.dialogs.editElement.form.current = this.dialogs.editElement.form.empty
        this.scene.stage.snapshot()
      },
      addCustomAttribute () {
        this.dialogs.customProperty.title = 'Add Custom Property'
        this.dialogs.customProperty.type = 'property'
        this.dialogs.customProperty.visible = true
      },
      addCustomEvent () {
        this.dialogs.customProperty.title = 'Add Custom Event'
        this.dialogs.customProperty.type = 'event'
        this.dialogs.customProperty.visible = true
      },
      addCustomProperty (type) {
         this.$refs['customProperty'].validate((valid) => {

          if (valid) {
            let name = this.dialogs.customProperty.form.name.toLowerCase()
            let prop = null
            // 检查是否重复
            if (this.dialogs.customProperty.type === 'property'){
              for(let p of this.dialogs.editElement.form.props) {
                if (p.key === name) {
                  this.$Message.error(`Property ${name} has existed!`)
                  return
                }
              }
              prop = {
                      type:'property',
                      key: name,
                      value: '',
                      desc: '自定义属性',
                      values: [],
                      datatype: ['string'],
                      default: '',
                      selected: true,
                      custom: true,
                      canBind: true,
                      prefix: ':',
                      required: false,
                      bound: false
              }
              this.dialogs.editElement.form.props.push(prop)
            } else {
              for(let evt of this.dialogs.editElement.form.events) {
                if (evt.key === name) {
                  this.$Message.error(`Event ${name} has existed!`)
                  return
                }
              }
              prop = {
                      type:'event',
                      key: name,
                      value: '',
                      desc: '自定义属性',
                      datatype: ['function'],
                      default: '',
                      values: [],
                      selected: true,
                      custom: true,
                      canBind: true,
                      prefix: '@',
                      required: false,
                      bound: true
              }
              this.dialogs.editElement.form.events.push(prop)
            }
            this.dialogs.customProperty.visible = false
            this.dialogs.editElement.form.current = prop
          }
        })
      },
      closeCustomProperty () {
         this.dialogs.customProperty.visible = false
      },
      clearAttribute (name) {
        for(let p of this.dialogs.editElement.form.props) {
          if (p.key === name){
            p.value = ''
            p.selected = false
            break
          }
        }
      },
      clearEvent (name) {
        for(let p of this.dialogs.editElement.form.events) {
          if (p.key === name){
            p.value = ''
            p.selected = false
            break
          }
        }
      },
      handleSelectAttribute (name) {
        for(let p of this.dialogs.editElement.form.props) {
          if (p.key === name){
            this.dialogs.editElement.form.current = p
            console.log(p)
            break
          }
        }
      },
      handleSelectEvent (name) {
        for(let p of this.dialogs.editElement.form.events) {
          if (p.key === name){
            this.dialogs.editElement.form.current = p
            break
          }
        }
      },
      handleChangePropertyName (evt) {
        let found = false
        for(let p of this.dialogs.editElement.form.props) {
          if (p.key === this.dialogs.editElement.form.current.key){
            found = true
            break
          }
        }
        
        // 调整为自定义属性
        if (!found) {
          this.dialogs.editElement.form.current.custom = true
          this.dialogs.editElement.form.current.desc = '自定义属性'
        }
      },
      handleChangePropertyValue (evt) {
        this.dialogs.editElement.form.current.selected = !(this.dialogs.editElement.form.current.value === '')
      },
      handleChangePropertyDataType (name) {
        if (name === 'array') {
          this.dialogs.editElement.form.current.default = '[]'
        } else if (name === 'object') {
          this.dialogs.editElement.form.current.default = '{}'
        } else if (name === 'boolean') {
          this.dialogs.editElement.form.current.default = 'false'
        } else if (name === 'number') {
          this.dialogs.editElement.form.current.default = '0'
        } else {
          this.dialogs.editElement.form.current.default = ''
        }
      },
      closeEditElement () {
        this.dialogs.editElement.visible = false
        this.dialogs.editElement.model = null
        this.dialogs.editElement.form.current = this.dialogs.editElement.form.empty
      },
      updateText () {
        this.dialogs.editText.visible = false
        this.dialogs.editText.model.changeText(this.dialogs.editText.form.text)
        this.dialogs.editText.model.refresh()
        this.dialogs.editText.model = null
        this.scene.stage.snapshot()
      },
      closeEditText () {
        this.dialogs.editText.visible = false
        this.dialogs.editText.model = null 
      },
      selectNavMenu (name) {
        if (name === 'search') {
          if(this.split.ratio < 0.1) {
            this.split.ratio = this.split.oldRatio
            this.split.minWidth = 300
            this.split.maxWidth = 600
          } else {
            this.split.oldRatio = this.split.ratio
            this.split.ratio = 0
            this.split.minWidth = 0
            this.split.maxWidth = 1
          }
        } else if (name === 'document') {
          this.openDocument()
        } else if (name === 'load') {
          this.readScript()
        } else if (name === 'save') {
          this.writeScript()
        } else if (name === 'debug') {
          this.scene.stage.clearSelection()
          this.scriptEditor.visible = true
          this.$nextTick(() => {
            this.$refs['code'].refresh()
          })
        } else if (name === 'about') {
          this.dialogs.about.visible = true
        }
      },
      test(){
        const code = '<template><!-- abc --><div class="container" v-resize="onContainerResize"><Layout><Sider hide-trigger width="300"><Tree ref="tree" :data="tree.data" class="card-tree"></Tree></Sider><Content><table><template><div></div></template></Table></Content></Layout></div></template><style scoped></style><abc></abc>'
        this.scriptEditor.code = beautify(code,{indent_size: 2})
      }
    },
    created: function () {
      this.components.libs = UILibs.getCategories()
      for(let lib of this.components.libs){
        this.components.filters.push(lib.category)
      }

      this.components.vuedefs = UILibs.vueDefs()
      this.dialogs.editElement.form.current = this.dialogs.editElement.form.empty

      this.vscodeExtMode = window.__vscodeExtMode__
       this.test()
    },
    mounted: function () {
      this.size.width = this.$el.clientWidth
      this.size.height = this.$el.clientHeight
      this.size.scrollHeight = this.size.height - 80

      this.scene.stage = troll.init({
        container: 'scene',
        width: this.size.width,
        height: this.size.height,
        debug: true,
        events: {
          error: (info) => {
            this.$Notice.error({
              title: info.type,
              desc: info.desc,
              duration: 30,
              closable: true
            })
          },
          select: (elem) => {

          },
          edit: (elem, prop) => {
            const nodeType = elem.nodeType()
            if (nodeType === 'element') {
              this.dialogs.editElement.form.tagName = elem.tagName()
              this.dialogs.editElement.form.tagCategory = elem.tagCategory() || ''

              let defs = UILibs.search({
                key: this.dialogs.editElement.form.tagName,
                fuzzy: false,
                filters: (this.dialogs.editElement.form.tagCategory !== '') ? [this.dialogs.editElement.form.tagCategory] : []
              })

              const showDlg = () => {
                // 属性
                let props = []
                // 事件
                let events = []
               
                let maps = {}
                const form = this.dialogs.editElement.form

                let propdefs = {}
                let evtdefs = {}
                let slotdefs = []
                if (form.def && form.def.elements && form.def.elements.length >= 1) {
                  console.log('[[[[[[', form.def.elements[0])
                  propdefs = form.def.elements[0].props
                  evtdefs = form.def.elements[0].events
                  slotdefs = form.def.elements[0].slots
                }
                
                let elemjson = elem.toJson()

                for(let p of elemjson.properties){
                  if (propdefs[p.config.key]){
                    maps[p.config.key] = true
                    const pdef = propdefs[p.config.key] 
                    props.push(Object.assign({}, pdef, {
                      type: 'property',
                      key: p.config.key,
                      value: p.config.value || '',
                      selected: true,
                      custom: false,
                      prefix: ':',
                      bound: p.config.prefix === ':'
                    }))
                  } else if (evtdefs[p.config.key]) { 
                    maps[p.config.key] = true
                    const evtdef = evtdefs[p.config.key]
                    events.push(Object.assign({}, evtdef, {
                      type: 'event',
                      key: p.config.key,
                      value: p.config.value || '',
                      selected: true,
                      custom: false,
                      prefix: '@',
                      bound: p.config.prefix === '@'
                    }))
                  } else {
                    props.push({
                      type: p.config.prefix === '@' ? 'event' : 'property',
                      key: p.config.key,
                      value: p.config.value || '',
                      desc: '自定义属性',
                      datatype: ['string'],
                      values: [],
                      default: '',
                      selected: true,
                      custom: true,
                      canBind: true,
                      required: false,
                      prefix: ':',
                      bound: p.config.prefix === ':'
                    })
                  }
                }

                for(let [k,v] of Object.entries(propdefs)) {
                  if (!maps[k]) {
                    props.push(Object.assign({}, v, {
                      type: 'property',
                      key: k,
                      value: '',
                      selected: false,
                      custom: false,
                      prefix: ':',
                      bound: false
                    }))
                  }
                }

                // 处理slots
                for(let p of props) {
                  if (p.key === 'slot') {
                    p.values = slotdefs
                    break
                  }
                }
                this.dialogs.editElement.form.props = props

                 // 事件
                for(let [k,v] of Object.entries(evtdefs)) {
                  if (!maps[k]) {
                    events.push(Object.assign({}, v, {
                      type: 'event',
                      key: k,
                      value: '',
                      selected: false,
                      custom: false,
                      prefix: '@',
                      bound: true
                    }))
                  }
                }
                this.dialogs.editElement.form.events = events
                
                if (prop) {
                  this.handleSelectAttribute(prop)
                  this.handleSelectEvent(prop)
                }

                this.dialogs.editElement.model = elem
                this.dialogs.editElement.visible = true
              }

              // 如果找到多个，则需要进行选择
              if (defs.length > 1) {
                this.dialogs.editElement.form.tagCategory = defs[0].category

                this.$Modal.confirm({
                    title: 'Select Component Library',
                    render: (h) => {
                        return h('i-select', {
                            props: {
                                value: this.dialogs.editElement.form.tagCategory
                            },
                            on: {
                                'on-change': (val) => {
                                  this.dialogs.editElement.form.tagCategory = val
                                }
                            }
                        }, 
                        defs.map((item) => {
                          return h('i-option', {
                            props: {
                              value: item.category,
                              label: item.title
                            }
                          })
                       }))
                    },
                    onOk: () => {
                      for(let d of defs) {
                        if (d.category === this.dialogs.editElement.form.tagCategory) {
                          this.dialogs.editElement.form.def = d
                          break
                        }
                      }
                      showDlg()
                    }
                })
              } else if (defs.length === 1) {
                this.dialogs.editElement.form.def = defs[0]
                this.dialogs.editElement.form.tagCategory = this.dialogs.editElement.form.def.category
                showDlg()
              } else {
                this.dialogs.editElement.form.tagCategory = 'custom'
                this.dialogs.editElement.form.def = null
                showDlg()
              }
              
            } else if (nodeType === 'text' || nodeType === 'comment' ) {
              // 正文内容
              this.dialogs.editText.title = 'Edit ' + (nodeType === 'text' ? 'Text' : 'Comment')
              this.dialogs.editText.model = elem
              this.dialogs.editText.form.text = elem.text()
              this.dialogs.editText.visible = true
            }
          }
        }
      })

      this.test()
      this.readScript()
      //window.__callVscode__({ cmd: 'alert', info: 'info' })

    },
    activated: function () {
    }
  };
</script>

