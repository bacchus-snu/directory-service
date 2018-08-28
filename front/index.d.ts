import Vue, { ComponentOptions } from 'vue'

declare module '*.vue' {
  import Vue from 'vue'
  const _default: Vue
  export default _default
}

/* Cite: https://stackoverflow.com/a/49090772 */
declare module 'vue/types/options' {
  interface ComponentOptions<V extends Vue> {
    middleware?: string | Array<string>
  }
}
