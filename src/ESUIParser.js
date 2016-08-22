/**
 * @file ESUIParser
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import HTMLExprParser from 'vtpl/parsers/HTMLExprParser';
import Node from 'vtpl/nodes/Node';
import esui from 'esui';
import ViewContext from 'esui/ViewContext';
import * as util from 'vtpl/utils';
import {extend, each, isFunction} from 'underscore';
import DoneChecker from 'vtpl/DoneChecker';

const EVENT_PREFIX_REGEXP = /^esui-on-/;
const CONTROL_PREFIX_REGEXP = /^esui/;

/**
 * ESUIParser
 *
 * @class
 * @extends {HTMLExprParser}
 */
export default class ESUIParser extends HTMLExprParser {

    static priority = 4;
    controlType;

    /**
     * constructor
     *
     * @public
     * @override
     * @param  {Object} options 参数
     */
    constructor(options) {
        super(options);

        this.createViewContext();

        this.controlType = CONTROL_PREFIX_REGEXP.test(this.startNode.getTagName())
            ? util.line2camel(this.startNode.getTagName().replace(CONTROL_PREFIX_REGEXP, ''))
            : this.startNode.getAttribute('esui-type');
    }

    /**
     * 创建ESUI的viewContext
     *
     * @private
     */
    createViewContext() {
        let viewContext = this.tree.getTreeVar('esuiViewContext');
        if (!viewContext) {
            viewContext = new ViewContext();
            this.tree.setTreeVar('esuiViewContext', viewContext);
        }
    }

    /**
     * initRender
     *
     * @override
     * @public
     * @param  {Function} done 执行完成的回调函数
     */
    initRender(done) {
        const doneChecker = new DoneChecker(done);

        doneChecker.add(innerDone => super.initRender(innerDone));
        doneChecker.add(innerDone => {
            const domUpdater = this.getDOMUpdater();
            const taskId = domUpdater.generateNodeAttrUpdateId(this.startNode, ' esui-render');

            domUpdater.addTaskFn(
                taskId,
                () => {
                    const controlOptions = extend(
                        {},
                        this.initProperties,
                        {
                            main: this.startNode.getDOMNode(),
                            viewContext: this.tree.getTreeVar('esuiViewContext')
                        }
                    );

                    const ref = this.startNode.getAttribute('ref');
                    this.control = esui.create(this.controlType, controlOptions);
                    if (ref) {
                        this.setAttr('ref', ref);
                    }
                    this.control.render();

                    each(this.initProperties, (propertyValue, propertyName) => {
                        if (EVENT_PREFIX_REGEXP.test(propertyName)) {
                            this.bindEvent(propertyName.replace(EVENT_PREFIX_REGEXP, ''), propertyValue);
                        }
                    });

                    this.initProperties = null;
                },
                innerDone
            );
        });

        doneChecker.complete();
    }

    /**
     * 绑定ESUI控件的回调函数
     *
     * @private
     * @param  {string} eventName 事件名
     * @param  {Function} handler   事件回调函数
     */
    bindEvent(eventName, handler) {
        if (!isFunction(handler)) {
            return;
        }
        this.control.on(eventName, handler);
    }

    /**
     * setAttr
     *
     * @protected
     * @override
     * @param {string} attrName  属性名
     * @param {*} attrValue 属性值
     */
    setAttr(attrName, attrValue) {
        if (attrName === 'esui-type') {
            return;
        }
        else if (attrName === 'ref') {
            this.ref = attrValue;
            const children = this.tree.getTreeVar('children');
            children[attrValue] = this.control;
        }
        else if (!this.control) {
            this.initProperties = this.initProperties || {};
            if (attrName.indexOf('extension-') === 0) {
                this.initProperties.extensions = this.initProperties.extensions || [];
                const extension = esui.createExtension(attrValue, {});
                extension && this.initProperties.extensions.push(extension);
            }
            else {
                this.initProperties[attrName] = attrValue;
            }
        }
        else {
            if (EVENT_PREFIX_REGEXP.test(attrName)) {
                this.bindEvent(attrName.replace(EVENT_PREFIX_REGEXP, ''), attrValue);
            }
            else {
                this.control.set(attrName, attrValue);
            }
        }
    }

    /**
     * release
     *
     * @override
     * @protected
     */
    release() {
        if (this.control) {
            this.control.destroy();
        }
        super.release();
    }

    /**
     * isProperNode
     *
     * @static
     * @override
     * @public
     * @param  {WrapNode}  node 节点
     * @return {boolean}
     */
    static isProperNode(node) {
        return node.getNodeType() === Node.ELEMENT_NODE
            && (
                CONTROL_PREFIX_REGEXP.test(node.getTagName())
                || node.getAttribute('esui-type')
            );
    }
}
