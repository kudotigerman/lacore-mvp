/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.lacore.ai" }],
        destination: "https://lacore.ai/:path*",
        permanent: true
      }
    ];
  }
};

export default nextConfig;
