import { VNode } from './vnode';
import options from './options';


const stack = []; // 用来放待处理的孩子节点。可能是个嵌套的数组，要一直处理到扁平一维数组。

const EMPTY_CHILDREN = []; // 这里仅仅是为了语义化。毕竟一个空数组意义不明确。

/**
 * JSX/hyperscript reviver.
 * @see http://jasonformat.com/wtf-is-jsx
 * Benchmarks: https://esbench.com/bench/57ee8f8e330ab09900a1a1a0
 *
 * Note: this is exported as both `h()` and `createElement()` for compatibility
 * reasons.
 *
 * Creates a VNode (virtual DOM element). A tree of VNodes can be used as a
 * lightweight representation of the structure of a DOM tree. This structure can
 * be realized by recursively comparing it against the current _actual_ DOM
 * structure, and applying only the differences.
 *
 * `h()`/`createElement()` accepts an element name, a list of attributes/props,
 * and optionally children to append to the element.
 *
 * @example The following DOM tree
 *
 * `<div id="foo" name="bar">Hello!</div>`
 *
 * can be constructed using this function as:
 *
 * `h('div', { id: 'foo', name : 'bar' }, 'Hello!');`
 *
 * @param {string | function} nodeName An element name. Ex: `div`, `a`, `span`, etc.
 * @param {object | null} attributes Any attributes/props to set on the created element.
 * @param {VNode[]} [rest] Additional arguments are taken to be children to
 *  append. Can be infinitely nested Arrays.
 *
 * @public
 */
export function h(nodeName, attributes) {
	// lastSimple 是为了判断连续2个节点是不是都是简单孩子节点
	let children=EMPTY_CHILDREN, lastSimple, child, simple, i;
	for (i=arguments.length; i-- > 2; ) {
		// 第二个参数以后的都是待处理的孩子节点，推到stack里
		stack.push(arguments[i]);
	}
	if (attributes && attributes.children!=null) {
		// 这里应该是为了兼容另一种孩子节点的表示法
		// 即 再属性里加上children属性来表示孩子
		if (!stack.length) stack.push(attributes.children);
		delete attributes.children;
	}
	while (stack.length) {
		// 循环处理 stack 内的孩子节点，目的是把嵌套的数组孩子节点扁平到一维
		if ((child = stack.pop()) && child.pop!==undefined) {
			for (i=child.length; i--; ) stack.push(child[i]);
			// todo:?
			// 简单push到尾部，不用考虑原来结构中的的顺序吗
		}
		else {
			// 孩子已经不是数组了，已经是一个单独的项了，可以处理了
			// 孩子是boolean类型，直接置为null，应该是不用渲染的
			if (typeof child==='boolean') child = null;

			if ((simple = typeof nodeName!=='function')) {
				// 孩子【不是】一个函数，初步判断它是一个简单类型的孩子
				if (child==null) child = ''; // 孩子是null，渲染为空字符串
				else if (typeof child==='number') child = String(child); // 孩子是数字，渲染为字符串的数字
				else if (typeof child!=='string') simple = false; // 孩子虽然不是函数，但也不是字符串，不是数字，不是boolean，所以页不算是简单孩子
			}
			// 所以可以总结下
			// boolean，数字，字符串 是简单孩子
			// boolean 不渲染，数字，字符串 都渲染为字符串
			// 其它的都是复杂的

			if (simple && lastSimple) {
				// 如果连续两个简单孩子，就把他们简单字符串相连
				children[children.length-1] += child;
			}
			// 非简单孩子，直接放进children数组里
			else if (children===EMPTY_CHILDREN) {
				children = [child];
				// 这里为什么不统一children.push(child)
				// 因为现在 children 是连着 EMPTY_CHILDREN的引用
				// 直接push 会改变 EMPTY_CHILDREN
			}
			else {
				children.push(child);
			}

			lastSimple = simple;
		}
	}

	let p = new VNode();
	p.nodeName = nodeName;
	p.children = children;
	p.attributes = attributes==null ? undefined : attributes;
	p.key = attributes==null ? undefined : attributes.key;

	// if a "vnode hook" is defined, pass every created VNode to it
	if (options.vnode!==undefined) options.vnode(p);

	return p;
}
