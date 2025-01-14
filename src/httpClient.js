import axios from 'axios'
import qs from 'qs'

export const mainHttpClient = axios.create({
  baseURL: `${process.env.PUBLIC_URL}/api/v1`,

  // serialize a param with an array value as a repeated param, for example:
  // { label: ['host', 'owner=admin'] } => 'label=host&label=owner%3Dadmin'
  paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' })
})

export const functionTemplatesHttpClient = axios.create({
  baseURL: `${process.env.PUBLIC_URL}/function-catalog`
})

export const nuclioHttpClient = axios.create({
  baseURL: `${process.env.PUBLIC_URL}/nuclio/api`
})

export const iguazioHttpClient = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? '/api' : '/iguazio/api'
})
