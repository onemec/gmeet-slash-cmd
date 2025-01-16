import { Auth } from 'googleapis'
import { v7 as uuidv7 } from 'uuid'
import { read, write } from './storage'
import { AuthUser, PersistedAuthState, SlackUser } from './types'
import { Credentials, OAuth2Client } from 'google-auth-library'
import { S3 } from 'aws-sdk'

const SCOPES: string[] = ['https://www.googleapis.com/auth/calendar.events']

/**
 * Creates an OAuth2 client using the Google APIs client library.
 *
 * @param {Credentials} [tokens] - Optional tokens to set as credentials for the client.
 * @returns {Auth.OAuth2Client} - The OAuth2 client instance.
 */
export const createOAuthClient = (tokens?: Credentials): Auth.OAuth2Client => {
  const client = new Auth.OAuth2Client({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URL,
  })
  if (tokens) {
    client.setCredentials(tokens)
  }
  return client
}

/**
 * Generates an authentication URL for the OAuth2 flow.
 *
 * @param {SlackUser} user - The Slack user initiating the authentication.
 * @param {string} setup - The setup identifier for the authentication process.
 * @returns {string} - The generated authentication URL.
 */
export const generateAuthUrl = (user: SlackUser, setup: string): string => {
  const client: OAuth2Client = createOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: JSON.stringify({ ...user, setup }),
  })
}

/**
 * Reads the authentication state for a given Slack user.
 *
 * @param {SlackUser} user - The Slack user whose authentication state is being read.
 * @returns {Promise<PersistedAuthState | null>} - The persisted authentication state or null if not found.
 */
const readAuthState = async (
  user: SlackUser
): Promise<PersistedAuthState | null> => {
  const key = `${user.team}/${user.id}/auth`
  const raw: S3.Body = await read(key)
  if (raw) {
    return JSON.parse(raw.toString())
  } else {
    return null
  }
}

/**
 * Writes the authentication state for a given Slack user.
 *
 * @param {SlackUser} user - The Slack user whose authentication state is being written.
 * @param {PersistedAuthState} state - The authentication state to persist.
 * @returns {Promise<boolean>} - True if the write operation was successful.
 */
const writeAuthState = async (
  user: SlackUser,
  state: PersistedAuthState
): Promise<boolean> => {
  const key = `${user.team}/${user.id}/auth`
  return await write(key, JSON.stringify(state))
}

/**
 * Retrieves the authenticated user information for a given Slack user.
 *
 * @param {SlackUser} user - The Slack user whose authenticated user information is being retrieved.
 * @returns {Promise<AuthUser>} - The authenticated user information.
 * @throws {Error} - If the persisted state doesn't contain tokens or is in an unexpected state.
 */
export const getAuthUser = async (user: SlackUser): Promise<AuthUser> => {
  const state: PersistedAuthState = await readAuthState(user)
  if (state && state.status === 'done' && state.tokens) {
    return {
      team: state.team,
      id: state.id,
      tokens: state.tokens,
    }
  } else {
    const ser: string = JSON.stringify(state)
    throw new Error(
      `Persisted state doesn't contain tokens or unexpected state.\n${ser}`
    )
  }
}

/**
 * Checks if a given Slack user is ready to use the authenticated services.
 *
 * @param {SlackUser} user - The Slack user to check.
 * @returns {Promise<boolean>} - True if the user is ready to use the authenticated services.
 */
export const readyToUse = async (user: SlackUser): Promise<boolean> => {
  const state: PersistedAuthState = await readAuthState(user)
  return state && state.status === 'done' && state.tokens
}

/**
 * Prepares the authentication state for a given Slack user.
 *
 * @param {SlackUser} user - The Slack user to prepare for authentication.
 * @returns {Promise<string>} - The setup identifier for the authentication process.
 */
export const prepareForAuth = async (user: SlackUser): Promise<string> => {
  const setup = uuidv7()
  const payload: PersistedAuthState = { ...user, status: 'auth', setup }
  await writeAuthState(user, payload)
  return setup
}

/**
 * Verifies the authentication state for a given Slack user.
 *
 * @param {SlackUser} user - The Slack user to verify.
 * @param {string} setup - The setup identifier for the authentication process.
 * @returns {Promise<boolean>} - True if the authentication state is valid.
 */
export const verifyAuth = async (
  user: SlackUser,
  setup: string
): Promise<boolean> => {
  const state = await readAuthState(user)
  console.log(JSON.stringify(state))
  return (
    state &&
    state.status === 'auth' &&
    state.id === user.id &&
    state.team === user.team &&
    state.setup === setup
  )
}

/**
 * Prepares the callback state for a given Slack user.
 *
 * @param {SlackUser} user - The Slack user to prepare for callback.
 * @param {string} setup - The setup identifier for the callback process.
 */
export const prepareForCallback = async (user: SlackUser, setup: string) => {
  const payload: PersistedAuthState = { ...user, status: 'callback', setup }
  await writeAuthState(user, payload)
}

/**
 * Extracts the setup identifier from the state string.
 *
 * @param {string} state - The state string containing the setup identifier.
 * @returns {string} - The extracted setup identifier.
 */
export const extractSetupFromState = (state: string): string => {
  const { setup } = JSON.parse(state)
  return setup
}

/**
 * Verifies the callback state for a given Slack user.
 *
 * @param {SlackUser} user - The Slack user to verify.
 * @param {string} setup - The setup identifier for the callback process.
 * @returns {Promise<boolean>} - True if the callback state is valid.
 */
export const verifyCallback = async (
  user: SlackUser,
  setup: string
): Promise<boolean> => {
  const state: PersistedAuthState = await readAuthState(user)
  console.log(JSON.stringify(state))
  return (
    state &&
    state.status === 'callback' &&
    state.id === user.id &&
    state.team === user.team &&
    state.setup === setup
  )
}

/**
 * Prepares the user for using the authenticated services.
 *
 * @param {SlackUser} user - The Slack user to prepare.
 * @param {string} code - The authorization code to exchange for tokens.
 */
export const prepareForUse = async (user: SlackUser, code: string) => {
  const client: OAuth2Client = createOAuthClient()
  const { tokens } = await client.getToken(code)
  const payload: PersistedAuthState = { ...user, status: 'done', tokens }
  await writeAuthState(user, payload)
}
