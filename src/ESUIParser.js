/**
 * @file ESUIParser
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import HTMLExprParser from 'vtpl/parsers/HTMLExprParser';
import Node from 'vtpl/nodes/Node';
import esui from 'esui';
import ViewContext from 'esui/ViewContext';
import * as util from 'vtpl/utils';
import {extend} from 'underscore';

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
            const controlOptions = extend(this.initProperties, {main: this.startNode.getDOMNode()});
            this.control = esui.create(this.controlType, controlOptions);
            this.control.render();
            this.initProperties = null;
            done && done();
        });
    }

    setAttr(attrName, attrValue) {
        if (!this.control) {
            this.initProperties = this.initProperties || {};
            this.initProperties[attrName] = attrValue;
        }
        else {
            this.control.set(attrName, attrValue);
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
