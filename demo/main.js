import ESUIParser from 'ev-esui/ESUIParser';
import Vtpl from 'vtpl';
import 'ev-esui/all';

const vtpl = new Vtpl({
    startNode: document.body,
    endNode: document.body
});

vtpl.registerParser(ESUIParser);
vtpl.render();
vtpl.setData({
    buttonContent: '按钮',
    selectDatasource: [
        {
            name: '张三',
            value: 1
        },
        {
            name: '李四',
            value: 2
        }
    ]
});
