var path = require('path');
const { override, babelInclude } = require('customize-cra');

module.exports = function (config, env) {
  return Object.assign(
    config,
    override(
      babelInclude([
        /* Transpile code in src/ and shared component library */
        path.resolve('src'),
        path.resolve('../../react-components'),
      ])
    )(config, env)
  );
};
