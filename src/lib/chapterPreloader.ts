/**
 * 章节资源预加载器
 * 在总地图打开时后台预加载三个章节的关键资源(视频、图片)
 * 提升章节切换时的流畅度
 */

interface PreloadTask {
  url: string;
  type: 'video' | 'image';
  priority: number;
}

class ChapterPreloader {
  private loadedUrls = new Set<string>();
  private loading = new Set<string>();
  private abortController: AbortController | null = null;

  /**
   * 开始预加载所有章节的关键资源
   */
  start(baseUrl: string = '') {
    if (this.abortController) return; // 已在运行
    this.abortController = new AbortController();

    // 只列仓库里真有、且各章一进去就要用的图：三张章节地图。
    // 原来那版列的是 opening.mp4 / bgm.mp3 / paper-bg.webp 这类并不存在的文件，
    // 请求全 404，控制台报错把 e2e 的 atlas 用例弄红；真正的开场视频在各章
    // assets/ 下，由章节自己取，这里再拉一遍只是重复流量。
    const tasks: PreloadTask[] = [
      { url: `${baseUrl}chapters/north/map.webp`, type: 'image', priority: 1 },
      { url: `${baseUrl}chapters/south/assets/map.jpg`, type: 'image', priority: 2 },
      { url: `${baseUrl}chapters/central/assets/map.jpg`, type: 'image', priority: 3 },
    ];

    // 按优先级排序
    tasks.sort((a, b) => a.priority - b.priority);

    // 异步并发加载,每个优先级组等待完成后再加载下一组
    this.loadByPriority(tasks, this.abortController.signal);
  }

  /**
   * 停止预加载
   */
  stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.loading.clear();
  }

  /**
   * 按优先级分组加载
   */
  private async loadByPriority(tasks: PreloadTask[], signal: AbortSignal) {
    const groups = new Map<number, PreloadTask[]>();

    // 按优先级分组
    for (const task of tasks) {
      if (!groups.has(task.priority)) groups.set(task.priority, []);
      groups.get(task.priority)!.push(task);
    }

    // 逐组加载
    const priorities = Array.from(groups.keys()).sort((a, b) => a - b);
    for (const priority of priorities) {
      if (signal.aborted) break;
      const group = groups.get(priority)!;
      await Promise.allSettled(group.map(task => this.loadResource(task, signal)));
    }
  }

  /**
   * 加载单个资源
   */
  private async loadResource(task: PreloadTask, signal: AbortSignal): Promise<void> {
    if (this.loadedUrls.has(task.url) || this.loading.has(task.url)) return;

    this.loading.add(task.url);

    try {
      if (task.type === 'video') {
        await this.preloadVideo(task.url, signal);
      } else {
        await this.preloadImage(task.url, signal);
      }
      this.loadedUrls.add(task.url);
    } catch (error) {
      // 预加载失败不影响主流程,静默处理
      if (signal.aborted) return;
      console.debug(`Preload ${task.type} failed:`, task.url, error);
    } finally {
      this.loading.delete(task.url);
    }
  }

  /**
   * 预加载视频 - 使用fetch缓存,不创建DOM元素避免内存占用
   */
  private async preloadVideo(url: string, signal: AbortSignal): Promise<void> {
    const response = await fetch(url, {
      signal,
      method: 'GET',
      cache: 'force-cache',
      // 只请求部分数据建立缓存,不下载完整文件
      headers: { 'Range': 'bytes=0-1048576' } // 前1MB
    });

    if (!response.ok && response.status !== 206) {
      throw new Error(`HTTP ${response.status}`);
    }

    // 读取并丢弃,确保浏览器缓存生效
    await response.arrayBuffer();
  }

  /**
   * 预加载图片
   */
  private async preloadImage(url: string, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }

      const img = new Image();

      const cleanup = () => {
        signal.removeEventListener('abort', onAbort);
        img.onload = null;
        img.onerror = null;
      };

      const onAbort = () => {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      };

      img.onload = () => {
        cleanup();
        resolve();
      };

      img.onerror = () => {
        cleanup();
        reject(new Error('Image load failed'));
      };

      signal.addEventListener('abort', onAbort);
      img.src = url;
    });
  }

  /**
   * 获取预加载状态
   */
  getStatus() {
    return {
      loaded: this.loadedUrls.size,
      loading: this.loading.size,
      isActive: this.abortController !== null
    };
  }
}

// 导出单例
export const chapterPreloader = new ChapterPreloader();
