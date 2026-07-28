export const fetcher = (url) => fetch(url).then(res => {
  if (!res.ok) throw new Error('请求失败');
  return res.json();
});