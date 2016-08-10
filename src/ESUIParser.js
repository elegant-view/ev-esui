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

export default class ESUIParser extends HTMLExprParser {

    constructor(options) {
        super(options);

        this.createViewContext();
    }

    createViewContext() {
        let viewContext = this.tree.getTreeVar('esuiViewContext');
        if (!viewContext) {
            viewContext = new ViewContext();
            this.tree.setTreeVar('esuiViewContext', viewContext);
        }
    }

    collectExprs() {
        super.collectExprs();

        this.controlType = util.line2camel(this.startNode.getTagName().replace(/^esui/, ''));
    }

    initRender(done) {
        super.initRender(() => {
            const controlOptions = extend(
                {},
                this.initProperties,
                {
                    main: this.startNode.getDOMNode(),
                    viewContext: this.tree.getTreeVar('esuiViewContext')
                }
            );
            this.control = esui.create(this.controlType, controlOptions);
            this.control.render();

            each(this.initProperties, (propertyValue, propertyName) => {
                if (/^esui-on-/.test(propertyName)) {
                    this.bindEvent(propertyName.replace(/^esui-on-/, ''), propertyValue);
                }
            });

            this.initProperties = null;
            done && done();
        });
    }

    bindEvent(eventName, handler) {
        if (!isFunction(handler)) {
            return;
        }
        this.control.on(eventName, handler);
    }

    setAttr(attrName, attrValue) {
        if (attrName === 'ref') {
            this.ref = attrValue;
            const children = this.tree.getTreeVar('children');
            children[attrValue] = this.control;
        }
        else if (!this.control) {
            this.initProperties = this.initProperties || {};
            this.initProperties[attrName] = attrValue;
        }
        else {
            if (/^esui-on-/.test(attrName)) {
                this.bindEvent(attrName.replace(/^esui-on-/, ''), attrValue);
            }
            else {
                this.control.set(attrName, attrValue);
            }
        }
    }

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
        return node.getNodeType() === Node.ELEMENT_NODE && /^esui-/.test(node.getTagName());
    }
}
