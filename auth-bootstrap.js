/* EduFlow auth bootstrap: wait for the profile trigger before app-core handles a session. */
(function () {
  'use strict';
  const nativeCreateClient = window.supabase?.createClient;
  if (!nativeCreateClient || window.__eduflowAuthBootstrap) return;
  window.__eduflowAuthBootstrap = true;

  function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  async function waitForProfile(client, userId) {
    if (!userId) return;
    for (let i = 0; i < 10; i++) {
      try {
        const { data, error } = await client.from('profiles').select('id,organization_id,role').eq('id', userId).maybeSingle();
        if (!error && data?.id && data.organization_id) return data;
      } catch (_) {}
      await delay(400);
    }
  }

  window.supabase.createClient = function (...args) {
    const client = nativeCreateClient(...args);
    if (!client?.auth || client.auth.__eduflowWrapped) return client;
    const nativeSignIn = client.auth.signInWithPassword.bind(client.auth);
    const nativeSignUp = client.auth.signUp.bind(client.auth);
    client.auth.signInWithPassword = async (...signInArgs) => {
      const result = await nativeSignIn(...signInArgs);
      if (!result?.error && result.data?.user?.id) await waitForProfile(client, result.data.user.id);
      return result;
    };
    client.auth.signUp = async (...signUpArgs) => {
      const result = await nativeSignUp(...signUpArgs);
      if (!result?.error && result.data?.user?.id && result.data?.session) await waitForProfile(client, result.data.user.id);
      return result;
    };
    Object.defineProperty(client.auth, '__eduflowWrapped', { value: true, enumerable: false });
    return client;
  };
})();
