/**
 * @file ESUI控件封装
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import Component, {type} from 'vcomponent/Component';
import {PropTypes} from 'vcomponent/type';
import {propsType} from 'vcomponent/decorators';
import esui from 'esui';
import {extend, omit, each} from 'underscore';
import Tree from 'vtpl/trees/Tree';

@propsType({
    evType: PropTypes.string.required
})
@type('Esui')
export default class Esui extends Component {

    /**
     * 记录一下事件回调，方便销毁
     *
     * @private
     * @type {Object}
     */
    eventCache = {};

    /**
     * 当前控件是否隐藏
     *
     * @type {boolean}
     */
    isHide = false;

    /**
     * @override
     */
    getTemplate() {
        return '<div ref="main" class="{props.class}"></div>';
    }

    /**
     * 获取控件类型
     *
     * @protected
     * @return {string} 控件类型
     */
    getControlType() {
        return this.props.evType;
    }

    /**
     * 在隐藏之前销毁控件，防止控件上的方法调用带来不必要的麻烦
     *
     * @override
     */
    beforeHide() {
        this.isHide = true;
        this.destroyControl();
    }

    /**
     * 显示出来的时候，把控件重新创建出来
     *
     * @override
     */
    afterShow() {
        this.isHide = false;
        if (!this.control) {
            this.createControl();
        }
    }

    /**
     * 挂载到DOM树种的时候才创建ESUI控件
     *
     * @override
     */
    initMounted() {
        if (!this.isHide) {
            this.createControl();
        }
    }

    /**
     * 把props属性透传到ESUI控件，同时处理一下事件绑定
     *
     * @override
     */
    propsChange(changedProps) {
        if (this.control) {
            this.control.setProperties(changedProps);
            this.bindEvent(changedProps);
        }
    }

    /**
     * 创建ESUI控件
     *
     * @private
     */
    createControl() {
        // 抽出扩展
        const extensions = [];
        each(this.props, (value, name) => {
            if (name.indexOf('extension') === 0) {
                const extension = esui.createExtension(value, {});
                extension && extensions.push(extension);
            }
        });

        const properties = extend(
            {main: this.refs.main.getDOMNode()},
            {extensions},
            omit(this.props, 'children', 'evType', 'class')
        );
        this.control = esui.create(this.getControlType(), properties);
        if (!this.control) {
            throw new Error('unknown control type');
        }

        this.control.render();
        this.mountChildren();

        this.bindEvent(this.props);
    }

    /**
     * 销毁ESUI控件
     *
     * @private
     */
    destroyControl() {
        this.control && this.control.dispose();
        this.control = null;

        this.childrenTree && this.childrenTree.destroy();
        this.childrenTree = null;
        this.eventCache = {};
        this.refs.main && this.refs.main.setInnerHTML('');
    }

    /**
     * 绑定事件
     *
     * @private
     * @param  {Object} props 当前props
     */
    bindEvent(props) {
        each(props, (value, name) => {
            if (typeof value === 'function' && name.indexOf('on') === 0) {
                const eventName = name.replace('on', '').toLowerCase();
                if (this.eventCache[eventName]) {
                    this.control.un(eventName);
                }

                this.control.on(eventName, value);
                this.eventCache[eventName] = value;
            }
        });
    }

    /**
     * 挂载子孙节点。目前只能挂载一次
     *
     * @private
     */
    mountChildren() {
        let container;
        if (this.props.evType === 'Dialog') {
            container = this.control.getBody().main.firstElementChild;
            container.innerHTML = '';
        }
        else {
            container = this.refs.main;
        }

        const children = this.props.children;

        if (!children.getStartNode() || !children.getEndNode()) {
            return;
        }

        // 如果之前创建了这种子树，直接销毁掉。
        if (this.childrenTree) {
            throw new Error('already have a child tree.');
        }

        const nodesManager = children.getParentTree().getTreeVar('nodesManager');
        container = nodesManager.getNode(container);

        // 将children节点插入到dom树里面去
        children.iterateClone(curNode => {
            container.appendChild(curNode);
        });

        // 创建子树
        this.childrenTree = new Tree({
            startNode: container,
            endNode: container
        });
        this.childrenTree.setParent(children.getParentTree());
        children.getParentTree().rootScope.addChild(this.childrenTree.rootScope);

        this.childrenTree.compile();
        this.childrenTree.link();
        this.childrenTree.initRender();
    }

    /**
     * 调用ESUI控件上面的方法
     *
     * @public
     * @param  {string}    methodName 方法名
     * @param  {...*} args       传递给方法的参数
     * @return {*}
     */
    invoke(methodName, ...args) {
        let control = this.control;
        if (control) {
            return control[methodName](...args);
        }
    }

    /**
     * @override
     */
    destroy() {
        this.destroyControl();
        this.eventCache = null;
    }
}
