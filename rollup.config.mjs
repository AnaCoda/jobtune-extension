import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';

export default [
  {
    input: 'panel/hello.js',
    output: {
      dir: 'dist/panel',
      format: 'iife',
    },
    plugins: [
      nodeResolve({
        jsnext: true,
        main: true,
        browser: true
      }),
      commonjs(),
      copy({
        targets: [
          {
            src: ['manifest.json', 'panel', 'images'],
            dest: 'dist'
          }
        ]
      })
    ]
  }
];