document.addEventListener("DOMContentLoaded", () => {
  const auth = window.actionBuyerAuth;
  async function signImages() {
    const images = [...document.querySelectorAll(".admin-photo-grid img")];
    for (const img of images) {
      const path = img.getAttribute("src");
      if (!path || /^https?:\/\//i.test(path)) continue;
      try {
        const { data, error } = await auth.supabase.storage.from("quote-photos").createSignedUrl(path, 3600);
        if (error || !data?.signedUrl) continue;
        img.src = data.signedUrl;
        const link = img.closest("a");
        if (link) link.href = data.signedUrl;
      } catch (_) {}
    }
  }
  const observer = new MutationObserver(() => signImages());
  observer.observe(document.body, { childList: true, subtree: true });
  signImages();
});
