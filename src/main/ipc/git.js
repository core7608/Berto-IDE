const simpleGit = require('simple-git');

function registerGitHandlers(ipcMain) {
  ipcMain.handle('git:status', async (_e, repoPath) => {
    try {
      const git = simpleGit(repoPath);
      const isRepo = await git.checkIsRepo();
      if (!isRepo) return { success: true, isRepo: false };
      const status = await git.status();
      return { success: true, isRepo: true, status };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('git:init', async (_e, repoPath) => {
    try {
      await simpleGit(repoPath).init();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('git:add', async (_e, repoPath, files) => {
    try {
      const git = simpleGit(repoPath);
      await git.add(files || '.');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('git:commit', async (_e, repoPath, message) => {
    try {
      const git = simpleGit(repoPath);
      const result = await git.commit(message);
      return { success: true, result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('git:push', async (_e, repoPath) => {
    try {
      const git = simpleGit(repoPath);
      const result = await git.push();
      return { success: true, result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('git:pull', async (_e, repoPath) => {
    try {
      const git = simpleGit(repoPath);
      const result = await git.pull();
      return { success: true, result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('git:log', async (_e, repoPath) => {
    try {
      const git = simpleGit(repoPath);
      const log = await git.log({ maxCount: 100 });
      return { success: true, log: log.all };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('git:diff', async (_e, repoPath, file) => {
    try {
      const git = simpleGit(repoPath);
      const diff = file ? await git.diff([file]) : await git.diff();
      return { success: true, diff };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('git:branches', async (_e, repoPath) => {
    try {
      const git = simpleGit(repoPath);
      const branches = await git.branch();
      return { success: true, branches };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('git:checkout', async (_e, repoPath, branch) => {
    try {
      const git = simpleGit(repoPath);
      await git.checkout(branch);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerGitHandlers };
