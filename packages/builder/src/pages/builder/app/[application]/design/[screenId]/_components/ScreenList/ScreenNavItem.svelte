<script lang="ts">
  import { Modal, Helpers, notifications, Icon } from "@budibase/bbui"
  import {
    screenStore,
    userSelectedResourceMap,
    contextMenuStore,
    componentStore,
  } from "@/stores/builder"
  import NavItem from "@/components/common/NavItem.svelte"
  import RoleIndicator from "./RoleIndicator.svelte"
  import ScreenDetailsModal from "@/components/design/ScreenDetailsModal.svelte"
  import sanitizeUrl from "@/helpers/sanitizeUrl"
  import { makeComponentUnique } from "@/helpers/components"
  import { capitalise } from "@/helpers"
  import ConfirmDialog from "@/components/common/ConfirmDialog.svelte"
  import type { Screen } from "@budibase/types"

  export let screen
  export let deletionAllowed: boolean

  let confirmDeleteDialog: ConfirmDialog
  let screenDetailsModal: Modal

  const createDuplicateScreen = async ({ route }: { route: string }) => {
    // Create a dupe and ensure it is unique
    let duplicateScreen = Helpers.cloneDeep(screen)
    delete duplicateScreen._id
    delete duplicateScreen._rev
    duplicateScreen.props = makeComponentUnique(duplicateScreen.props)

    // Attach the new name and URL
    duplicateScreen.routing.route = sanitizeUrl(route)
    duplicateScreen.routing.homeScreen = false

    try {
      const linkLabel = capitalise(duplicateScreen.routing.route.split("/")[1])

      await screenStore.save({
        ...duplicateScreen,
        navigationLinkLabel: linkLabel,
      })
    } catch (error) {
      notifications.error("Error duplicating screen")
    }
  }

  const deleteScreen = async () => {
    try {
      await screenStore.delete(screen)
      notifications.success("Deleted screen successfully")
    } catch (err) {
      notifications.error("Error deleting screen")
    }
  }

  $: noPaste = !$componentStore.componentToPaste

  const pasteComponent = (mode: "inside") => {
    try {
      componentStore.paste(screen.props, mode, screen)
    } catch (error) {
      notifications.error("Error saving component")
    }
  }

  const openContextMenu = (e: MouseEvent, screen: Screen) => {
    e.preventDefault()
    e.stopPropagation()

    const items = [
      {
        icon: "stack",
        name: "Paste inside",
        keyBind: null,
        visible: true,
        disabled: noPaste,
        callback: () => pasteComponent("inside"),
      },
      {
        icon: "copy",
        name: "Duplicate",
        keyBind: null,
        visible: true,
        disabled: false,
        callback: screenDetailsModal.show,
      },
      {
        icon: "trash",
        name: "Delete",
        keyBind: null,
        visible: true,
        disabled: !deletionAllowed,
        callback: confirmDeleteDialog.show,
        tooltip: deletionAllowed ? "" : "At least one screen is required",
      },
    ]

    contextMenuStore.open(screen._id!, items, { x: e.clientX, y: e.clientY })
  }
</script>

<NavItem
  on:contextmenu={e => openContextMenu(e, screen)}
  scrollable
  icon={screen.routing.homeScreen ? "house" : null}
  indentLevel={0}
  selected={$screenStore.selectedScreenId === screen._id}
  hovering={screen._id === $contextMenuStore.id}
  text={screen.routing.route}
  on:click={() => screenStore.select(screen._id)}
  rightAlignIcon
  showTooltip
  selectedBy={$userSelectedResourceMap[screen._id]}
>
  <Icon
    on:click={e => openContextMenu(e, screen)}
    size="M"
    hoverable
    name="dots-three"
  />
  <div slot="right" class="icon">
    <RoleIndicator roleId={screen.routing.roleId} />
  </div>
</NavItem>

<ConfirmDialog
  bind:this={confirmDeleteDialog}
  title="Confirm Deletion"
  body={"Are you sure you wish to delete this screen?"}
  okText="Delete screen"
  onOk={deleteScreen}
/>

<Modal bind:this={screenDetailsModal}>
  <ScreenDetailsModal
    onConfirm={createDuplicateScreen}
    route={screen?.routing.route}
    role={screen?.routing.roleId}
    confirmText="Duplicate"
  />
</Modal>

<style>
  .icon {
    margin-left: 4px;
    margin-right: 4px;
  }
</style>
