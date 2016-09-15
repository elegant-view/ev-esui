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
    eventCache = {};
    isHide = false;

    getTemplate() {
        return '<div ref="main" class="{props.class}"></div>';
    }

    getControlType() {
        return this.props.evType;
    }

    init() {

    }

    beforeHide() {
        this.isHide = true;
        this.destroyControl();
    }

    afterShow() {
        this.isHide = false;
        if (!this.control) {
            this.createControl();
        }
    }

    initMounted() {
        if (!this.isHide) {
            this.createControl();
        }
    }

    propsChange(changedProps) {
        if (this.control) {
            this.control.setProperties(changedProps);
            this.bindEvent(changedProps);
        }
    }

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

    destroyControl() {
        this.control && this.control.dispose();
        this.control = null;

        this.childrenTree && this.childrenTree.destroy();
        this.childrenTree = null;
        this.eventCache = {};
        this.refs.main && this.refs.main.setInnerHTML('');
    }

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

    getControl() {
        return this.control;
    }

    destroy() {
        this.destroyControl();
        this.eventCache = null;
    }
}
