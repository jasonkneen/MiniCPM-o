<template>
    <svg :class="iconClass" v-html="content" v-if="content"></svg>
</template>

<script setup>
const props = defineProps({
    name: {
        type: String,
        required: true
    },
    className: {
        type: String,
        default: ''
    }
});

const content = ref('');
const iconClass = computed(() => ['svg-icon', props.className]);

const loadSvg = async () => {
    try {
        // First try to load from apis/assets/svg
        const module = await import(`../../apis/assets/svg/${props.name}.svg?raw`).catch(() => null);
        if (module) {
            content.value = module.default;
            return;
        }
        
        // If not found, try loading from assets/svg as fallback
        const fallbackModule = await import(`../../assets/svg/${props.name}.svg?raw`).catch(() => null);
        if (fallbackModule) {
            content.value = fallbackModule.default;
            return;
        }

        console.warn(`SVG icon not found: ${props.name}`);
    } catch (error) {
        console.warn(`Failed to load SVG icon: ${props.name}`, error);
    }
};

onMounted(() => {
    loadSvg();
});

watch(() => props.name, () => {
    loadSvg();
});
</script>

<style lang="less" scoped>
.svg-icon {
    width: 24px;
    height: 24px;
}
</style>
