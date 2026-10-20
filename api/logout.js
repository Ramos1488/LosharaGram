module.exports = (req, res) => {
  res.setHeader('Set-Cookie', 'lg_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  res.writeHead(302, { Location: '/' }); res.end();
};
