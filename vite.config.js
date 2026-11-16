import{defineConfig}from"vite";const repo=process.env.GITHUB_REPOSITORY?.split("/").pop()||"Oregon.exe";export default defineConfig({base:`/${repo}/`});
