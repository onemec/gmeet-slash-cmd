/**
 * Represents a Slack user with a team and an ID.
 */
export interface SlackUser {
  team: string
  id: string
}

/**
 * Represents an authenticated user, extending SlackUser with tokens.
 */
export type AuthUser = SlackUser & {
  tokens: any
}

/**
 * Represents a block in a Slack message.
 */
export interface MessageBlock {
  type: 'section'
  text: {
    type: 'mrkdwn'
    text: string
  }
}

/**
 * Defines the possible response types for a Slack message.
 */
export type ResponseType = 'in_channel' | 'ephemeral'

/**
 * Represents a Slack message with blocks and a response type.
 */
export interface SlackMessage {
  blocks: MessageBlock[]
  response_type: ResponseType
}

/**
 * Represents query parameters as a key-value pair.
 */
export interface QueryParams {
  [name: string]: any
}

/**
 * Represents common authentication state with an ID and team.
 */
interface CommonAuthState {
  id: string
  team: string
}

/**
 * Represents the state before authentication, extending CommonAuthState with status and setup.
 */
export type BeforeAuth = CommonAuthState & {
  status: 'auth'
  setup: string
}

/**
 * Represents the state before callback, extending CommonAuthState with status and setup.
 */
export type BeforeCallback = CommonAuthState & {
  status: 'callback'
  setup: string
}

/**
 * Represents the state with a token, extending CommonAuthState with status and tokens.
 */
export type HasToken = CommonAuthState & {
  status: 'done'
  tokens: any
}

/**
 * Represents the persisted authentication state, which can be BeforeAuth, BeforeCallback, or HasToken.
 */
export type PersistedAuthState = BeforeAuth | BeforeCallback | HasToken
