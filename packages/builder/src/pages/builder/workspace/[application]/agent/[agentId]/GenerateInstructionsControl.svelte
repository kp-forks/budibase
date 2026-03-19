<script lang="ts">
  import {
    Button,
    Modal,
    ModalContent,
    TextArea,
    notifications,
  } from "@budibase/bbui"
  import { FeatureFlag, type EnrichedBinding } from "@budibase/types"
  import { featureFlags } from "@/stores/portal"
  import { API } from "@/api"
  import { tick } from "svelte"
  import CodeEditor from "@/components/common/CodeEditor/CodeEditor.svelte"
  import { EditorModes } from "@/components/common/CodeEditor"

  export let aiconfigId = ""
  export let agentName = ""
  export let goal = ""
  export let toolReferences: string[] = []
  export let promptBindings: EnrichedBinding[] = []
  export let bindingIcons: Record<string, string | undefined> = {}
  export let onApplyInstructions: (_instructions: string) => void = () => {}

  let enabled = $derived(!!$featureFlags[FeatureFlag.AI_AGENT_INSTRUCTIONS])
  let modal = $state<Modal>()
  let promptField = $state<TextArea>()
  let prompt = $state("")
  let generatedInstructions = $state("")
  let generating = $state(false)
  let requestToken = $state(0)

  function resetState() {
    requestToken += 1
    prompt = ""
    generatedInstructions = ""
    generating = false
  }

  function hideModal() {
    modal?.hide()
  }

  function applyGeneratedInstructions() {
    onApplyInstructions(generatedInstructions)
    hideModal()
    notifications.success("Instructions updated successfully")
  }

  async function generateInstructions() {
    if (generating) {
      return
    }

    const currentRequestToken = ++requestToken
    generating = true

    try {
      const { instructions } = await API.generateAgentInstructions({
        aiconfigId,
        prompt,
        agentName,
        goal,
        toolReferences,
      })

      if (currentRequestToken !== requestToken) {
        return
      }

      notifications.success("Instructions generated successfully")
      generatedInstructions = instructions
    } catch (error: any) {
      if (currentRequestToken !== requestToken) {
        return
      }

      notifications.error(
        error?.message ||
          error?.json?.message ||
          "Error generating instructions"
      )
    } finally {
      if (currentRequestToken === requestToken) {
        generating = false
      }
    }
  }
</script>

{#if enabled}
  <Button secondary size="S" icon="sparkle" on:click={() => modal?.show()}>
    Generate
  </Button>

  <Modal
    bind:this={modal}
    on:show={async () => {
      await tick()
      promptField?.focus()
    }}
    on:hide={resetState}
  >
    <ModalContent
      title={generatedInstructions
        ? "Review Generated Instructions"
        : "Generate Instructions"}
      size="M"
      showCloseIcon
      showConfirmButton={false}
      showCancelButton={false}
    >
      {#if generatedInstructions}
        <div class="generated-instructions-preview">
          <CodeEditor
            value={generatedInstructions}
            bindings={promptBindings}
            {bindingIcons}
            mode={EditorModes.Handlebars}
            renderBindingsAsTags={true}
            renderMarkdownDecorations={true}
            placeholder=""
            on:change={event => {
              generatedInstructions = event.detail || ""
            }}
          />
        </div>
        <div class="generate-instructions-actions">
          <Button secondary on:click={hideModal}>Cancel</Button>
          <Button cta on:click={applyGeneratedInstructions}
            >Replace current</Button
          >
        </div>
      {:else}
        <TextArea
          label="Prompt"
          bind:this={promptField}
          bind:value={prompt}
          minHeight={140}
          disabled={generating}
          placeholder="Describe what kind of instructions you want to generate..."
        />
        <div class="generate-instructions-actions">
          <Button secondary disabled={generating} on:click={hideModal}
            >Cancel</Button
          >
          <Button
            cta
            icon="sparkle"
            disabled={generating || !prompt.trim()}
            on:click={generateInstructions}
          >
            {generating ? "Generating..." : "Generate"}
          </Button>
        </div>
      {/if}
    </ModalContent>
  </Modal>
{/if}

<style>
  .generate-instructions-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-s);
    margin-top: var(--spacing-m);
  }

  .generated-instructions-preview {
    border: 1px solid var(--spectrum-global-color-gray-200);
    border-radius: 8px;
    overflow: hidden;
    min-height: 220px;
  }
</style>
