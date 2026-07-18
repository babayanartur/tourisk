const queues = new Map();

function withDocumentLock(key, task) {
  const lockKey = String(key);
  const previous = queues.get(lockKey) || Promise.resolve();
  const queued = previous.catch(() => {}).then(task);
  queues.set(lockKey, queued);

  return queued.finally(() => {
    if (queues.get(lockKey) === queued) queues.delete(lockKey);
  });
}

export async function mutateDocumentById(Model, documentId, mutator, options = {}) {
  const maxAttempts = Math.max(1, Math.min(8, Number(options.maxAttempts || 5)));

  return withDocumentLock(documentId, async () => {
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const document = await Model.findById(documentId);
      if (!document) {
        const error = new Error(options.notFoundMessage || "Документ не найден");
        error.status = 404;
        throw error;
      }

      const result = await mutator(document, attempt);

      try {
        await document.save();
        return { document, result, attempts: attempt };
      } catch (error) {
        lastError = error;
        if (error?.name !== "VersionError" || attempt >= maxAttempts) throw error;
      }
    }

    throw lastError || new Error("Не удалось сохранить изменения");
  });
}
