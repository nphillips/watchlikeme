/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "yt3.ggpht.com", // YouTube profile pictures
      "yt3.googleusercontent.com", // Other YouTube thumbnails
      "i.ytimg.com", // YouTube video thumbnails
    ],
  },
};

module.exports = nextConfig;
