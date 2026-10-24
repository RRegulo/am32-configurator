<template>
  <div>
    <div class="p-4 max-w-[1400px] m-auto">
      <div v-if="status === 'pending'" class="text-4xl text-center text-red-500 p-5">
        <UIcon name="i-svg-spinners-blocks-wave" />
      </div>
      <div v-else class="flex flex-col gap-4">
        <UAccordion v-if="rootFolders.length > 0" :items="rootFolders" multiple>
          <template #tools_data>
            <div v-if="getFolder('tools').value" class="p-4">
              <div class="grid grid-cols-4">
                <div v-for="file of getFolder('tools').value?.files ?? []" :key="file.url" class="py-1">
                  <ULink
                    :to="`${file.url}`"
                    external
                    :download="file.name"
                    class="transition-all text-gray-300 hover:text-green-500"
                  >
                    {{ file.name }}
                  </ULink>
                </div>
              </div>
            </div>
          </template>
          <template #bootloader_data>
            <div v-if="getFolder('bootloader').value" class="p-4">
              <UAccordion color="teal" :items="getChildrenFolder(getFolder('bootloader').value)" variant="outline" size="sm">
                <template #files="{ item }">
                  <div class="grid grid-cols-4">
                    <div v-for="file of item.files" :key="file" class="py-1">
                      <ULink
                        :to="file.url"
                        external
                        :download="file.name"
                        class="transition-all text-gray-300 hover:text-red-500"
                      >
                        {{ file.name }}
                      </ULink>
                    </div>
                  </div>
                </template>
              </UAccordion>
            </div>
          </template>
        </UAccordion>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
const { data, status } = await useLazyFetch('/api/files?filter=bootloader,tools&prereleases');

const rootFolders = ref<{
  label: string,
  slot: string
}[]>([]);

watchEffect(() => {
    if (status.value !== 'pending' && data.value) {
        rootFolders.value = data.value.data
            .filter(f => f.name === 'bootloader' || f.name === 'tools')
            .map((f) => {
                return {
                    label: f.name?.toUpperCase() ?? 'ERROR',
                    slot: `${f.name}_data`
                };
            });
    }
});

const getFolder = (name: string) => computed(() => {
    return data.value?.data.find(b => b.name === name) ?? null;
});

const getChildrenFolder = (folder?: BlobFolder | null) => {
    return folder?.children
        .map(f => ({
            label: f.name,
            slot: 'files',
            files: f.files.filter(f => f.name.toLowerCase().endsWith('.hex'))
        }))
        .sort((a, b) => b.label.localeCompare(a.label)) ?? [];
};
</script>
