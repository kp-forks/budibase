<script lang="ts">
  import ScreenDetailsModal from "@/components/design/ScreenDetailsModal.svelte"
  import DatasourceModal from "./DatasourceModal.svelte"
  import TypeModal from "./TypeModal.svelte"
  import tableTypes from "./tableTypes"
  import formTypes from "./formTypes"
  import { Modal, ModalCancelFrom, notifications } from "@budibase/bbui"
  import {
    screenStore,
    permissions as permissionsStore,
    datasources,
    appStore,
  } from "@/stores/builder"
  import { goto } from "@roxi/routify"
  import * as screenTemplating from "@/templates/screenTemplating"
  import { Roles } from "@/constants/backend"
  import { AutoScreenTypes } from "@/constants"
  import type { SourceOption } from "./utils"
  import { makeTableOption, makeViewOption } from "./utils"
  import type {
    SaveScreenRequest,
    Screen,
    Table,
    ViewV2,
  } from "@budibase/types"

  export let workspaceAppId: string

  let mode: string

  let screenDetailsModal: Modal
  let datasourceModal: Modal
  let formTypeModal: Modal
  let tableTypeModal: Modal
  let selectedTablesAndViews: SourceOption[] = []
  let permissions: Record<
    string,
    {
      loading: boolean
      read: string
      write: string
    }
  > = {}
  let hasPreselectedDatasource = false

  $: screens = $screenStore.screens

  export const show = (
    newMode: string,
    preselectedDatasource: Table | ViewV2 | null = null
  ) => {
    mode = newMode
    selectedTablesAndViews = []
    permissions = {}
    hasPreselectedDatasource = preselectedDatasource != null

    if (mode === AutoScreenTypes.TABLE || mode === AutoScreenTypes.FORM) {
      if (preselectedDatasource) {
        // If preselecting a datasource, skip a step
        const isTable = preselectedDatasource.type === "table"
        const tableOrView = isTable
          ? makeTableOption(preselectedDatasource, $datasources.list)
          : makeViewOption(preselectedDatasource)
        fetchPermission(tableOrView.id)
        selectedTablesAndViews.push(tableOrView)
        onSelectDatasources()
      } else {
        // Otherwise choose a datasource
        datasourceModal.show()
      }
    } else if (mode === AutoScreenTypes.BLANK || mode === AutoScreenTypes.PDF) {
      screenDetailsModal.show()
    } else {
      throw new Error("Invalid mode provided")
    }
  }

  const createScreen = async (
    screenTemplate: SaveScreenRequest
  ): Promise<Screen> => {
    try {
      return await screenStore.save({
        ...screenTemplate,
        workspaceAppId: workspaceAppId!, // TODO
      })
    } catch (error) {
      console.error(error)
      notifications.error("Error creating screens")
      throw error
    }
  }

  const createScreens = async (
    screenTemplates: { data: Screen; navigationLinkLabel: string | null }[]
  ) => {
    const newScreens: Screen[] = []

    for (let screenTemplate of screenTemplates) {
      newScreens.push(
        await createScreen({
          ...screenTemplate.data,
          navigationLinkLabel: screenTemplate.navigationLinkLabel ?? undefined,
        })
      )
    }

    return newScreens
  }

  const onSelectDatasources = async () => {
    if (mode === AutoScreenTypes.FORM) {
      formTypeModal.show()
    } else if (mode === AutoScreenTypes.TABLE) {
      tableTypeModal.show()
    }
  }

  const createBasicScreen = async ({ route }: { route: string }) => {
    const screenTemplates =
      mode === AutoScreenTypes.BLANK
        ? screenTemplating.blank({ route, screens, workspaceAppId })
        : screenTemplating.pdf({ route, screens, workspaceAppId })
    const newScreens = await createScreens(screenTemplates)
    loadNewScreen(newScreens[0])
  }

  const createTableScreen = async (type: string) => {
    const screenTemplates = (
      await Promise.all(
        selectedTablesAndViews.map(tableOrView =>
          screenTemplating.table({
            screens,
            tableOrView,
            type,
            permissions: permissions[tableOrView.id],
            workspaceAppId,
          })
        )
      )
    ).flat()
    const newScreens = await createScreens(screenTemplates)
    loadNewScreen(newScreens[0])
  }

  const createFormScreen = async (type: string | null) => {
    const screenTemplates = (
      await Promise.all(
        selectedTablesAndViews.map(tableOrView =>
          screenTemplating.form({
            screens,
            tableOrView,
            type,
            permissions: permissions[tableOrView.id],
            workspaceAppId,
          })
        )
      )
    ).flat()
    const newScreens = await createScreens(screenTemplates)
    loadNewScreen(newScreens[0])
  }

  const loadNewScreen = (screen: Screen) => {
    if (screen.props?._children?.length) {
      // Focus on the main component for the screen type
      const mainComponent = screen.props?._children?.[0]._id
      $goto(
        `/builder/app/${$appStore.appId}/design/${screen._id}/${mainComponent}`
      )
    } else {
      $goto(`/builder/app/${$appStore.appId}/design/${screen._id}`)
    }

    screenStore.select(screen._id!)
  }

  const fetchPermission = (resourceId: string) => {
    permissions[resourceId] = {
      loading: true,
      read: Roles.BASIC,
      write: Roles.BASIC,
    }

    permissionsStore
      .forResource(resourceId)
      .then(permission => {
        if (permissions[resourceId]?.loading) {
          permissions[resourceId] = {
            loading: false,
            read: permission?.read?.role,
            write: permission?.write?.role,
          }
        }
      })
      .catch(e => {
        console.error("Error fetching permission data: ", e)

        if (permissions[resourceId]?.loading) {
          permissions[resourceId] = {
            loading: false,
            read: Roles.BASIC,
            write: Roles.BASIC,
          }
        }
      })
  }

  const deletePermission = (resourceId: string) => {
    delete permissions[resourceId]
    permissions = permissions
  }

  const handleTableOrViewToggle = ({
    detail: tableOrView,
  }: {
    detail: SourceOption
  }) => {
    const alreadySelected = selectedTablesAndViews.some(
      selected => selected.id === tableOrView.id
    )

    if (!alreadySelected) {
      fetchPermission(tableOrView.id)
      selectedTablesAndViews = [...selectedTablesAndViews, tableOrView]
    } else {
      deletePermission(tableOrView.id)
      selectedTablesAndViews = selectedTablesAndViews.filter(
        selected => selected.id !== tableOrView.id
      )
    }
  }
</script>

<Modal bind:this={datasourceModal} autoFocus={false} on:cancel>
  <DatasourceModal
    {selectedTablesAndViews}
    onConfirm={onSelectDatasources}
    on:toggle={handleTableOrViewToggle}
  />
</Modal>

<Modal
  bind:this={tableTypeModal}
  on:cancel={e => {
    if (
      [ModalCancelFrom.CANCEL_BUTTON, ModalCancelFrom.ESCAPE_KEY].includes(
        e.detail
      )
    ) {
      tableTypeModal.hide()
      datasourceModal.show()
    }
  }}
>
  <TypeModal
    title="Choose how you want to manage rows"
    types={tableTypes}
    onConfirm={createTableScreen}
    showCancelButton={!hasPreselectedDatasource}
  />
</Modal>

<Modal bind:this={screenDetailsModal} on:cancel>
  <ScreenDetailsModal onConfirm={createBasicScreen} />
</Modal>

<Modal
  bind:this={formTypeModal}
  on:cancel={e => {
    if (
      [ModalCancelFrom.CANCEL_BUTTON, ModalCancelFrom.ESCAPE_KEY].includes(
        e.detail
      )
    ) {
      formTypeModal.hide()
      datasourceModal.show()
    }
  }}
>
  <TypeModal
    title="Select form type"
    types={formTypes}
    onConfirm={createFormScreen}
    showCancelButton={!hasPreselectedDatasource}
  />
</Modal>
