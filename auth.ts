import { UserDTO } from "@osu-tournament-rating/otr-api-client"
import NextAuth from "next-auth"
import { Provider, OAuthConfig} from "next-auth/providers"

const testProvider: OAuthConfig<UserDTO> = {
    id: "otr",
    name: "osu! Tournament Rating",
    type: "oauth",
    token: {
        url: `${process.env.OTR_API_ROOT}/oauth/authorize`,
    },
    clientId: process.env.OSU_CLIENT_ID,
    authorization: {
        url: "https://osu.ppy.sh/oauth/authorize",
        params: { scope: "public friends.read" }
    },
    userinfo: `${process.env.OTR_API_ROOT}/me`,
    profile(profile) {
        return {
            id: profile.id.toString(),
            name: profile.player.username
        }
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [testProvider],
  events: {
    createUser() { console.log('create user') },
    linkAccount() { console.log('link account') },
    session() { console.log('session') },
    signIn() { console.log('sign in') },
    signOut() { console.log('sign out') },
    updateUser() { console.log('update user') },
  }
})