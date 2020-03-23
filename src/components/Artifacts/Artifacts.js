import React, { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import yaml from 'js-yaml'

import Content from '../../layout/Content/Content'

import artifactApi from '../../api/artifacts-api'
import artifactsAction from '../../actions/artifacts'
import artifactsData from './artifactsData'
import createArtifactsContent from '../../utils/createArtifactsContent'

import './artifacts.scss'

const Artifacts = ({
  artifactsStore,
  fetchArtifacts,
  match,
  selectArtifact,
  setArtifacts,
  removeSelectArtifact
}) => {
  const [artifacts, _setArtifacts] = useState(artifactsStore.artifacts)
  const [convertedYaml, setConvertedYaml] = useState()
  const [loading, setLoading] = useState(false)
  const [tableContent, setArtifactsContent] = useState([])

  const fetchData = useCallback(
    item => {
      setLoading(true)
      selectArtifact({ isPreview: false, item: {} })
      fetchArtifacts(item)
        .then(data => {
          const artifacts = data.map(artifact => {
            let item = null

            if (artifact.link_iteration) {
              let { link_iteration } = artifact.link_iteration
              item = artifact.data.filter(
                item => item.iter === link_iteration
              )[0]
            } else {
              item = artifact.data[0]
            }

            const index = item.target_path.indexOf('://')
            const target_path = {
              schema: item.target_path.includes('://')
                ? item.target_path.slice(0, index)
                : '',
              path: item.target_path.includes('://')
                ? item.target_path.slice(index + '://'.length)
                : item.target_path
            }

            item.target_path = target_path

            return item
          })

          _setArtifacts(artifacts)
          setLoading(false)
          return artifacts
        })
        .then(artifacts => {
          const content = createArtifactsContent(artifacts)
          setArtifactsContent(content)
        })
    },
    [fetchArtifacts, selectArtifact]
  )

  useEffect(() => {
    fetchData({ tag: 'latest', project: match.params.projectName })

    return () => {
      setArtifacts({ artifacts: [] })
    }
  }, [fetchData, setArtifacts, match.params.projectName])

  useEffect(() => {
    if (
      match.params.name !== undefined &&
      artifactsStore.artifacts.length !== 0
    ) {
      const { name } = match.params

      const [searchItem] = artifactsStore.artifacts.filter(item => {
        return item.key === name
      })
      const [artifact] = searchItem.data.filter(item => {
        if (searchItem.link_iteration) {
          const { link_iteration } = searchItem.link_iteration
          return link_iteration === item.iter
        }
        return true
      })
      selectArtifact({ isPreview: false, item: artifact })
    }
  }, [match.params, artifactsStore.artifacts, selectArtifact])

  useEffect(() => {
    artifactApi.getArtifactTag(match.params.projectName).then(item => {})
  }, [match.params.projectName])

  const convertToYaml = item => {
    document.getElementById('yaml_modal').style.display = 'flex'
    setConvertedYaml(
      yaml.dump(item, {
        lineWidth: -1
      })
    )
  }

  const handleSelectArtifact = item => {
    if (document.getElementsByClassName('view')[0]) {
      document.getElementsByClassName('view')[0].classList.remove('view')
    }
    selectArtifact({ isPreview: false, item })
  }

  const handleCancel = () => {
    removeSelectArtifact()
  }

  return (
    <Content
      content={artifacts}
      convertToYaml={convertToYaml}
      convertedYaml={convertedYaml}
      detailsMenu={artifactsData.detailsMenu}
      filters={artifactsData.filters}
      handleCancel={handleCancel}
      handleSelectItem={handleSelectArtifact}
      match={match}
      loading={loading}
      page={artifactsData.page}
      refresh={fetchData}
      selectedItem={artifactsStore.selectArtifact.item}
      tableContent={tableContent}
      tableHeaders={artifactsData.tableHeaders}
    />
  )
}

Artifacts.propTypes = {
  artifactsStore: PropTypes.shape({}).isRequired,
  fetchArtifacts: PropTypes.func.isRequired,
  match: PropTypes.shape({}).isRequired,
  selectArtifact: PropTypes.func.isRequired,
  setArtifacts: PropTypes.func.isRequired,
  removeSelectArtifact: PropTypes.func.isRequired
}

export default connect(
  artifactsStore => artifactsStore,
  artifactsAction
)(Artifacts)