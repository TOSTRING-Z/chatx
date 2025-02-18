<!-- MemoryPanel.vue -->
<template>
    <div class="memory-graph">
      <ForceGraph 
        :nodes="memoryNodes"
        :links="memoryLinks"
        @nodeClick="handleNodeClick"
      />
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        memoryNodes: computed(() => this.$store.state.memory.memories),
        memoryLinks: computed(() => this.$store.getters['memory/connections'])
      }
    },
    methods: {
      async refreshMemoryGraph() {
        const graphData = await window.memoryAPI.getMemoryGraph()
        this.$store.commit('memory/updateGraph', graphData)
      }
    }
  }
  </script>