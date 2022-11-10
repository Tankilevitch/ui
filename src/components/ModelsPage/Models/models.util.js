/*
Copyright 2019 Iguazio Systems Ltd.

Licensed under the Apache License, Version 2.0 (the "License") with
an addition restriction as set forth herein. You may not use this
file except in compliance with the License. You may obtain a copy of
the License at http://www.apache.org/licenses/LICENSE-2.0.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
implied. See the License for the specific language governing
permissions and limitations under the License.

In addition, you may not use the software for any purposes that are
illegal under applicable law, and the grant of the foregoing license
under the Apache 2.0 license is conditioned upon your compliance with
such restriction.
*/
import { cloneDeep, isEmpty, omit } from 'lodash'

import {
  ITERATIONS_FILTER,
  LABELS_FILTER,
  NAME_FILTER,
  TAG_FILTER,
  MODELS_PAGE,
  MODELS_TAB,
  TAG_LATEST
} from '../../../constants'
import { FORBIDDEN_ERROR_STATUS_CODE } from 'igz-controls/constants'
import { applyTagChanges } from '../../../utils/artifacts.util'
import { createModelsRowData } from '../../../utils/createArtifactsContent'
import { generateProducerDetailsInfo } from '../../../utils/generateProducerDetailsInfo'
import { getArtifactIdentifier } from '../../../utils/getUniqueIdentifier'
import { searchArtifactItem } from '../../../utils/searchArtifactItem'

export const filters = [
  { type: TAG_FILTER, label: 'Version tag:' },
  { type: NAME_FILTER, label: 'Name:' },
  { type: LABELS_FILTER, label: 'Labels:' },
  { type: ITERATIONS_FILTER, label: 'Show iterations' }
]

export const infoHeaders = [
  {
    label: 'Hash',
    id: 'hash',
    tip: 'Represents hash of the data. when the data changes the hash would change'
  },
  { label: 'Key', id: 'db_key' },
  { label: 'Version tag', id: 'tag' },
  { label: 'Iter', id: 'iter' },
  { label: 'Kind', id: 'kind' },
  { label: 'Size', id: 'size' },
  { label: 'Path', id: 'target_path' },
  { label: 'URI', id: 'target_uri' },
  { label: 'Model file', id: 'model_file' },
  { label: 'Feature vector', id: 'feature_vector' },
  {
    label: 'UID',
    id: 'tree',
    tip: 'Unique identifier representing the job or the workflow that generated the artifact'
  },
  { label: 'Updated', id: 'updated' },
  { label: 'Framework', id: 'framework' },
  { label: 'Algorithm', id: 'algorithm' },
  { label: 'Labels', id: 'labels' },
  { label: 'Metrics', id: 'metrics' },
  { label: 'Sources', id: 'sources' }
]

export const actionsMenuHeader = 'Register model'

export const fetchModelsRowData = async (
  fetchModel,
  model,
  setSelectedRowData,
  iter,
  tag,
  projectName
) => {
  const modelIdentifier = getArtifactIdentifier(model)

  setSelectedRowData(state => ({
    ...state,
    [modelIdentifier]: {
      loading: true
    }
  }))

  fetchModel(model.project, model, iter, tag)
    .then(result => {
      if (result?.length > 0) {
        setSelectedRowData(state => {
          return {
            ...state,
            [modelIdentifier]: {
              content: result.map(artifact => createModelsRowData(artifact, projectName)),
              error: null,
              loading: false
            }
          }
        })
      }
    })
    .catch(error => {
      setSelectedRowData(state => ({
        ...state,
        [modelIdentifier]: {
          ...state[modelIdentifier],
          error,
          loading: false
        }
      }))
    })
}

export const generateModelsDetailsMenu = selectedModel => [
  {
    label: 'overview',
    id: 'overview'
  },
  {
    label: 'preview',
    id: 'preview'
  },
  {
    label: 'features',
    id: 'features',
    hidden:
      !selectedModel.features &&
      !selectedModel.inputs &&
      !selectedModel.outputs &&
      !selectedModel.feature_vector
  },
  {
    label: 'statistics',
    id: 'statistics',
    hidden: !selectedModel.stats && !selectedModel.feature_stats && !selectedModel.feature_vector,
    tip: 'Note that some values may be empty due to the use of different engines for calculating statistics'
  }
]

export const generatePageData = selectedItem => ({
  page: MODELS_PAGE,
  details: {
    menu: generateModelsDetailsMenu(selectedItem),
    infoHeaders,
    type: MODELS_TAB,
    additionalInfo: {
      header: 'Producer',
      body: generateProducerDetailsInfo(selectedItem),
      hidden: !selectedItem.producer
    }
  }
})

export const getFeatureVectorData = uri => {
  const [name, tag = TAG_LATEST] = uri.slice(uri.lastIndexOf('/') + 1).split(/[@:]/)

  return { name, tag }
}

export const handleApplyDetailsChanges = (
  changes,
  fetchData,
  projectName,
  itemName,
  selectedItem,
  setNotification,
  filters,
  updateArtifact,
  dispatch
) => {
  const isNewFormat =
    selectedItem.ui.originalContent.metadata && selectedItem.ui.originalContent.spec
  const artifactItem = cloneDeep(
    isNewFormat ? selectedItem.ui.originalContent : omit(selectedItem, ['ui'])
  )
  let updateArtifactPromise = Promise.resolve()

  let updateTagPromise = applyTagChanges(
    changes,
    selectedItem,
    projectName,
    dispatch,
    setNotification
  )

  if (!isEmpty(omit(changes.data, ['tag']))) {
    Object.keys(changes.data).forEach(key => {
      if (key === 'labels') {
        isNewFormat
          ? (artifactItem.metadata[key] = changes.data[key].previousFieldValue)
          : (artifactItem[key] = changes.data[key].previousFieldValue)
      }
    })

    const labels = artifactItem.metadata?.labels || artifactItem.labels

    if (labels && Array.isArray(labels)) {
      const objectLabels = {}

      labels.forEach(label => {
        const splitedLabel = label.split(':')

        objectLabels[splitedLabel[0]] = splitedLabel[1].replace(' ', '')
      })

      isNewFormat
        ? (artifactItem.metadata.labels = { ...objectLabels })
        : (artifactItem.labels = { ...objectLabels })
    }

    updateArtifactPromise = updateArtifact(projectName, artifactItem)
      .then(response => {
        setNotification({
          status: response.status,
          id: Math.random(),
          message: 'Model was updated successfully'
        })
      })
      .catch(error => {
        setNotification({
          status: error.response?.status || 400,
          id: Math.random(),
          message:
            error.response?.status === FORBIDDEN_ERROR_STATUS_CODE
              ? 'Permission denied'
              : 'Failed to update the model',
          retry: () => updateArtifact(projectName, artifactItem)
        })
      })
  }

  return Promise.all([updateTagPromise, updateArtifactPromise])
}

export const checkForSelectedModel = (
  name,
  selectedRowData,
  models,
  tag,
  iter,
  uid,
  navigate,
  projectName,
  setSelectedModel
) => {
  if (name) {
    const artifacts = selectedRowData?.[name]?.content || models

    if (artifacts.length > 0) {
      const searchItem = searchArtifactItem(
        artifacts.map(artifact => artifact.data ?? artifact),
        name,
        tag,
        iter,
        uid
      )

      if (!searchItem) {
        navigate(`/projects/${projectName}/models/models}`, { replace: true })
      } else {
        setSelectedModel(searchItem)
      }
    }
  } else {
    setSelectedModel({})
  }
}