import { Client, Databases, Storage, Account, ID } from 'react-native-appwrite';
import 'react-native-url-polyfill/auto';

const endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ?? 'https://<REGION>.cloud.appwrite.io/v1';
const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? '<PROJECT_ID>';
const platform = process.env.EXPO_PUBLIC_APPWRITE_PLATFORM ?? 'com.example.app';

const client = new Client();

client.setEndpoint(endpoint).setProject(projectId).setPlatform(platform);

export const appwriteClient = client;
export const appwriteDatabases = new Databases(client);
export const appwriteStorage = new Storage(client);
export const appwriteAccount = new Account(client);
export const appwriteId = ID;
