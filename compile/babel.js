var generate = require("babel-generator");
var ANONYMOUS = '__anonymous';

var nodeCache = [];
var key = 1;

function getKey() {
  return (key++) + '';
}

// 是否是顶级的函数
// 小游戏最终的代码都是被包在define('xxx.js', function(){});里面的，所以如果遇到了这种格式的语法数，就当找到了顶层，直接取文件名xxx.js作为这一层的名字
function isTopFunction(t, path) {
  var result = {};

  if (path.node.type === 'FunctionExpression') {
    if (path.parent && path.parent.type === 'CallExpression' && path.parent.callee && path.parent.callee.name === 'define') {
      result = {
        isTop: true,
        name: path.parent.arguments[0].value || ''
      }
    }
  }

  return result;
}

function isLowest(path) {
  var lowest = false;
  if (path.node.type === 'FunctionExpression' || path.node.type === 'FunctionDeclaration') {
    lowest = true;
    for (var i = 0; i < path.node.body.body.length; i++) {
      if (path.node.body.body[i].type === 'ReturnStatement') {
        lowest = false;
      }
    }
  }

  return lowest;
}

// check 这个节点是否被赋值给其他变量
function checkAssignNode(path, lowest) {
  var parent = path.findParent(function () {
    return true;
  });

  if (parent.node) {
    // console.log(parent.node);
    if (parent.node.type === 'VariableDeclarator' && parent.node.id && parent.node.id.name) {
      // var test1 = function test2() {console.log(1)};类似这种类型的，名字要取test1,test2是不存在的
      return '';
    } else if (parent.node.type === 'ObjectProperty' && parent.node.key && parent.node.key.name) {
      // var a = {test: function test2(){console.log(1)}}; 这里的function名字去test
      return '';
    } else if (parent.node.type === 'AssignmentExpression' && parent.node.operator === '=' && parent.node.right === path.node) {
      // 复制运算， 类似于 test = function test1(){console.log(1);};
      if (parent.node.left.type === 'Identifier') {
        return '';
      } else if (parent.node.left.type === 'MemberExpression') {
        // 类似于 test.a.b = function test2(){console.log(1);};
        return ''
      }
    } else if (parent.node.type === 'SequenceExpression') {
      // 数列表达式类型: test = (b++, function test1() {alert(1)});
      // 判断这个函数是不是数列最后一个，不是的话也不会赋值，更不会执行，就不用管了
      return '';
    } else if (parent.node.type === 'ReturnStatement') {
      // 可能是一个被return出去的匿名函数，如果向上找到明确被赋值的运算，就可以确定这个匿名函数的名字了
      if (!lowest) {
        return (path.node.id || {}).name || ANONYMOUS;
      }

      var parent1 = parent.findParent(function () {
        return true;
      });
      if (parent1 && parent1.node.type === 'BlockStatement') {
        var parent2 = parent1.findParent(function () {
          return true;
        });
        if (parent2 && parent2.node.type === 'FunctionExpression' || parent2.node.type === 'FunctionDeclaration') {
          return checkAssignNode(parent2, lowest);
        }
      }

      return ANONYMOUS;
    } else if (parent.node.type === 'CallExpression') {
      // 这个函数被立即执行了
      if (!lowest) {
        return (path.node.id || {}).name || ANONYMOUS;
      }

      return checkAssignNode(parent, lowest);
    }
  }

  return (path.node.id || {}).name || ANONYMOUS;
}

// 生成当前函数的函数名
// 不找名字了，太耗性能了
function getFunctionName(t, path) {
  return '';
  var isTop = isTopFunction(t, path);
  if (isTop.isTop) {
    return isTop.name;
  }

  var names = [];
  var lowest = isLowest(path);
  var _unshift = names.unshift;
  names.unshift = function (item) {
    item && _unshift.call(names, item);
  };
  // 有名字就有id，没名字就是匿名函数
  names.unshift(checkAssignNode(path, lowest));
  // 继续向上找，确定该函数的定义路径，确保最终的取名可找、唯一
  var pre = path;
  path.findParent(function (_path) {
    // console.log('===============');
    var isTop = isTopFunction(t, _path);
    if (isTop.isTop) {
      // 到我们逻辑上的顶层了，直接return。 给客户端打出来的代码可能是把所有代码包在一个文件里的，所以不一定是实际上的顶层,这里直接终止.
      names.unshift(isTop.name);
      return true;
    }
    if (_path.node.type === 'FunctionDeclaration' || _path.node.type === 'FunctionExpression') {
      // 定义在函数里的函数
      names.unshift(checkAssignNode(path, lowest));
    } else if (_path.node.type === 'VariableDeclarator' && _path.node.id && _path.node.id.name) {
      names.unshift(_path.node.id.name);
    } else if (_path.node.type === 'ObjectProperty' && _path.node.key && _path.node.key.name) {
      // var a = {test: function test2(){}}; 这里的function名字去test
      names.unshift(_path.node.key.name);
    } else if (_path.node.type === 'AssignmentExpression' && _path.node.operator === '=' && _path.node.right === pre.node) {
      // 复制运算， 类似于 test = function test1(){};
      if (_path.node.left.type === 'Identifier') {
        names.unshift(_path.node.left.name);
      } else if (_path.node.left.type === 'MemberExpression') {
        // 类似于 test.a.b = function test2(){};
        names.unshift(generate.default({
          type: 'Program',
          body: [_path.node.left]
        }).code);
      }
    }

    pre = _path;
  });
  // console.log(names);
  return names.join('/');
}

function functionTransform(t, path) {
  if (path && path.node && path.node.id && path.node.id.name === '__skip__') {
    find = true;
    return true;
  }
  var find = false;
  var __skip = path.findParent(function (_path) {
    if (_path && _path.node && _path.node.id && _path.node.id.name === '__skip__') {
      find = true;
      return true;
    }
  });
  if (find) {
    return;
  }

  var bodyList = path.get('body').node.body || [];
  if (bodyList.length === 0) {
    // 空函数就不加了
    return;
  }
  var hasReturnStatement = false;
  // var name = getFunctionName(t, path);
  var key = getKey();
  var uid = path.scope.generateUidIdentifier("uid");
  nodeCache.push({
    node: path.node,
    key: key,
    uid: uid
  });
  // 创建开头和结果需要插入的节点
  var start = t.CallExpression(t.memberExpression(t.Identifier('q9zq'), t.Identifier('a')), [t.stringLiteral(key), t.ObjectExpression([])]);
  start = t.logicalExpression('&&', t.BinaryExpression('!==', t.UnaryExpression('typeof', t.Identifier('q9zq')), t.stringLiteral('undefined')), start);
  // var start = t.CallExpression(t.memberExpression(t.Identifier('q9zq'), t.Identifier('a')), [t.ObjectExpression([
  // t.ObjectProperty(t.Identifier('name'), t.stringLiteral(name)),
  // t.ObjectProperty(t.Identifier('a'), t.stringLiteral(key))
  // t.ObjectProperty(t.Identifier('start'), t.ObjectExpression([
  // 	t.ObjectProperty(t.Identifier('line'), t.NumericLiteral(((path.node.loc || {}).start || {}).line || 0)),
  // 	t.ObjectProperty(t.Identifier('column'), t.NumericLiteral(((path.node.loc || {}).start || {}).column || 0))
  // ]))
  // ])]);
  start = t.VariableDeclaration('var', [t.variableDeclarator(uid, start)]);
  // var end = t.CallExpression(t.memberExpression(t.Identifier('q9zq'), t.Identifier('b')), [t.ObjectExpression([
  // 	// t.ObjectProperty(t.Identifier('name'), t.stringLiteral(name)),
  // 	t.ObjectProperty(t.Identifier('a'), t.stringLiteral(key))
  // 	// t.ObjectProperty(t.Identifier('end'), t.ObjectExpression([
  // 	// 	t.ObjectProperty(t.Identifier('line'), t.NumericLiteral(((path.node.loc || {}).end || {}).line || 0)),
  // 	// 	t.ObjectProperty(t.Identifier('column'), t.NumericLiteral(((path.node.loc || {}).end || {}).column || 0))
  // 	// ]))
  // ])]);
  var end = t.CallExpression(t.memberExpression(t.Identifier('q9zq'), t.Identifier('b')), [t.stringLiteral(key), t.ObjectExpression([
    t.ObjectProperty(t.Identifier('s'), uid)
  ])]);
  end = t.logicalExpression('&&', t.BinaryExpression('!==', t.UnaryExpression('typeof', t.Identifier('q9zq')), t.stringLiteral('undefined')), end);
  // 现在最开头插一个
  path.get('body').unshiftContainer('body', start);

  bodyList.forEach(function (item) {
    // 函数最外层有return；
    if (item.type === 'ReturnStatement') {
      hasReturnStatement = true;
    }
  });

  if (!hasReturnStatement) {
    // 这段function代码没有return，那结尾插个end
    path.get('body').pushContainer('body', t.ExpressionStatement(end));
  }
}

// 找到return所在的function
function getReturnNearFunction(path) {
  return path.findParent(function (_path) {
    if (_path.node.type === 'FunctionExpression' || _path.node.type === 'FunctionDeclaration') {
      return true;
    }
  });
}

function ReturnStatement(path, t) {
  if (path && path.node && path.node.id && path.node.id.name === '__skip__') {
    find = true;
    return true;
  }
  var find = false;
  var __skip = path.findParent(function (_path) {
    if (_path && _path.node && _path.node.id && _path.node.id.name === '__skip__') {
      find = true;
      return true;
    }
  });
  if (find) {
    return;
  }

  if (path.node.start === undefined || path.node.end === undefined) {
    // 没有start和end的，就是代码动态插入的新节点，不需要处理
    return;
  }
  var key, parentUid;
  path.findParent(function (parent) {
    if (parent.node.type === 'FunctionExpression' || parent.node.type === 'FunctionDeclaration' || parent.node.type === 'ObjectMethod') {
      var index = nodeCache.findIndex(function (item) {
        return item.node === parent.node;
      });

      if (index > -1) {
        key = nodeCache[index].key;
        parentUid = nodeCache[index].uid;
        return true;
      }
    }
  });
  // 创建一个在用户代码当前上下文不冲突的唯一变量
  var uid = path.scope.generateUidIdentifier("uid");
  // var nearFunc = getReturnNearFunction(path);
  // var name = getFunctionName(t, nearFunc);
  // var end = t.CallExpression(t.memberExpression(t.Identifier('q9zq'), t.Identifier('b')), [t.ObjectExpression([
  // 	// t.ObjectProperty(t.Identifier('name'), t.stringLiteral(name)),
  // 	t.ObjectProperty(t.Identifier('a'), t.stringLiteral(key))
  // 	// t.ObjectProperty(t.Identifier('end'), t.ObjectExpression([
  // 	// 	t.ObjectProperty(t.Identifier('line'), t.NumericLiteral(((path.node.loc || {}).end || {}).line || 0)),
  // 	// 	t.ObjectProperty(t.Identifier('column'), t.NumericLiteral(((path.node.loc || {}).end || {}).column || 0))
  // 	// ]))
  // ])]);
  var end = t.CallExpression(t.memberExpression(t.Identifier('q9zq'), t.Identifier('b')), [t.stringLiteral(key), t.ObjectExpression([
    t.ObjectProperty(t.Identifier('s'), parentUid)
  ])]);

  end = t.logicalExpression('&&', t.BinaryExpression('!==', t.UnaryExpression('typeof', t.Identifier('q9zq')), t.stringLiteral('undefined')), end);

  /**
   * 把
   return (console.log(1), a = 6, 5);
  这种形式的代码转成
  var uid = (console.log(1), a = 6, 5);
  return uid这种格式的
  */
  if (path.node.argument && (path.node.argument.type === 'FunctionExpression' || (path.node.argument.type === 'CallExpression' && path.node.argument.callee.type === 'FunctionExpression'))) {
    // 匿名函数、立即执行函数不转
    path.insertBefore(t.ExpressionStatement(end));
    return;
  }

  ;

  var returnVar = t.VariableDeclaration('var', [t.variableDeclarator(uid, path.node.argument)]);
  var _return = t.ReturnStatement(uid);
  var parent = path.findParent(function () {
    return true
  });
  if (parent.node.type !== 'BlockStatement') {
    path.replaceWith(t.BlockStatement([returnVar, t.ExpressionStatement(end), _return]));
  } else {
    path.insertBefore(returnVar);
    path.insertBefore(t.ExpressionStatement(end));
    path.insertBefore(_return);
    // 移除用户的return代码
    path.remove();
  }
}

function ArrowFunctionExpression(path, t) {
  functionTransform(t, path);
}

function FunctionExpression(path, t) {
  functionTransform(t, path);
}

function FunctionDeclaration(path, t) {
  // console.log(path.node);
  functionTransform(t, path);
}

function ObjectMethod(path, t) {
  functionTransform(t, path);
}

module.exports = function ({
  types: t
}) {
  return {
    visitor: {
      Program(path) {
        path.traverse({
          ReturnStatement: function (path) {
            ReturnStatement(path, t);
          },
          FunctionDeclaration: function (path) {
            // ThrowStatement
            // console.log(path.node);
            FunctionDeclaration(path, t);
          },
          FunctionExpression: function (path) {
            FunctionExpression(path, t);
          },
          ArrowFunctionExpression: function (path) {
            ArrowFunctionExpression(path, t);
          },
          ObjectMethod: function (path) {
            ObjectMethod(path, t)
          }
        });
      }
    }
  }
};
