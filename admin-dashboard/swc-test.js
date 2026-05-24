try {
  require('@next/swc-linux-x64-musl');
  console.log('swc-musl-ok');
} catch (e) {
  console.error(String(e && e.message));
  process.exit(1);
}
