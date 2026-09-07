document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  const sidebar = document.querySelector('#sidebar');
  const menuToggle = document.querySelector('#menuToggle');
  const reviewModal = document.querySelector('#reviewModal');
  const toast = document.querySelector('#toast');
  const breadcrumbCurrent = document.querySelector('#breadcrumbCurrent');
  const navItems = document.querySelectorAll('.nav-item[data-view]');
  const queueTabs = document.querySelectorAll('.queue-tab');
  const reviewRows = document.querySelectorAll('.review-row');

  const urlInput = document.getElementById('ups-url');
  const urlWrap = document.getElementById('ups-url-wrap');
  const reviewButton = document.querySelector('.ups-review-button');
  const waitState = document.querySelector('.ups-review-state--waiting');
  const loadingState = document.querySelector('.ups-review-state--loading');
  const resultPanel = document.querySelector('.ups-review-result');
  const resultBody = document.getElementById('ups-result-body');
  const inlineMessage = document.getElementById('ups-inline-message');
  const workspacePanel = document.querySelector('.ups-workspace-panel');
  const reviewStage = document.querySelector('.ups-review-stage');
  const filesMetric = document.getElementById('ups-files-metric');
  const filesStatus = document.getElementById('ups-files-status');
  const scoreMetric = document.getElementById('ups-score-metric');
  const scoreStatus = document.getElementById('ups-score-status');
  const webhookUrl = 'http://localhost:5678/webhook/Code_Review';

  const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const formatReviewValue = (value) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const humanizeKey = (key) => key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());

  const isOverallScoreKey = (key) => /^(overall[_ -]?score|score)$/i.test(key);
  const isFinalKey = (key) => /^final$/i.test(key);

  const formatSummaryValue = (key, value) => {
    if (isOverallScoreKey(key) && value !== '' && !Number.isNaN(Number(value))) return `${Number(value)} / 100`;
    return formatReviewValue(value);
  };

  const getReviewMetrics = (payload) => {
    let source = payload;
    if (typeof source === 'string') {
      try {
        source = JSON.parse(source);
      } catch (error) {
        const scoreMatch = source.match(/overall\s+score\s*:\s*(\d+(?:\.\d+)?)/i);
        return { score: scoreMatch ? Number(scoreMatch[1]) : null, fileCount: 1 };
      }
    }
    if (Array.isArray(source) && source.length === 1 && source[0] && typeof source[0] === 'object') source = source[0];
    if (!source || typeof source !== 'object') return { score: null, fileCount: 1 };

    const entries = Object.entries(source);
    const scoreEntry = entries.find(([key]) => isOverallScoreKey(key));
    const score = scoreEntry && !Number.isNaN(Number(scoreEntry[1])) ? Number(scoreEntry[1]) : null;
    const fileEntry = entries.find(([key]) => /^(file|fileCount|files|filesAnalyzed|filesChecked|analyzedFiles)$/i.test(key));
    let fileCount = 1;
    if (fileEntry) {
      fileCount = Array.isArray(fileEntry[1]) ? fileEntry[1].length : Number(fileEntry[1]);
      if (!Number.isFinite(fileCount) || fileCount < 1) fileCount = 1;
    }
    return { score, fileCount };
  };

  const updateSummaryMetrics = (payload) => {
    const { score, fileCount } = getReviewMetrics(payload);
    if (filesMetric) filesMetric.textContent = `${fileCount} File${fileCount === 1 ? '' : 's'} Checked`;
    if (filesStatus) filesStatus.textContent = 'Live scan';
    if (scoreMetric && score !== null) scoreMetric.textContent = `${score}% Avg Quality Score`;
    if (scoreStatus) scoreStatus.textContent = score === null || score >= 60 ? 'Strong signal' : 'Needs attention';
  };

  const cleanMarkdown = (value) => String(value)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();

  const splitMarkdownRow = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cleanMarkdown(cell));

  const parseMarkdownReview = (markdown) => {
    const lines = String(markdown).replace(/\r/g, '').split('\n');
    const sections = [];
    let current = null;
    let index = 0;

    const ensureSection = (title, columns = ['Item', 'Details']) => {
      current = { title: cleanMarkdown(title), columns, rows: [] };
      sections.push(current);
      return current;
    };

    while (index < lines.length) {
      const rawLine = lines[index].trim();
      if (!rawLine) {
        index += 1;
        continue;
      }

      const headingMatch = rawLine.match(/^#{1,6}\s+(.+)$/);
      const titleMatch = rawLine.match(/^([^|\d][^:]{1,80}):\s*$/);
      if (/^result$/i.test(rawLine)) {
        ensureSection('Result', ['Field', 'Details']);
        index += 1;
        continue;
      }
      if (headingMatch || titleMatch) {
        ensureSection(headingMatch ? headingMatch[1] : titleMatch[1]);
        index += 1;
        continue;
      }

      if (rawLine.includes('|') && index + 1 < lines.length && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(lines[index + 1])) {
        const columns = splitMarkdownRow(rawLine);
        current = ensureSection(current?.title || 'Review Findings', columns);
        index += 2;
        while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
          current.rows.push(splitMarkdownRow(lines[index]));
          index += 1;
        }
        continue;
      }

      const keyValueMatch = rawLine.match(/^\*?\s*([^:]{1,80}):\s*(.+)$/);
      if (keyValueMatch && !/^\d+\./.test(rawLine)) {
        current = current || ensureSection('Result', ['Field', 'Details']);
        if (current.columns.length !== 2) current = ensureSection('Result', ['Field', 'Details']);
        current.rows.push([cleanMarkdown(keyValueMatch[1]), cleanMarkdown(keyValueMatch[2])]);
        index += 1;
        continue;
      }

      const bulletMatch = rawLine.match(/^(?:[*-]|\d+\.)\s+(.+)$/);
      if (bulletMatch) {
        current = current || ensureSection('Review Details');
        if (current.columns.length !== 2) current = ensureSection(current.title, ['Item', 'Details']);
        current.rows.push([`Item ${current.rows.length + 1}`, cleanMarkdown(bulletMatch[1])]);
        index += 1;
        continue;
      }

      current = current || ensureSection('Result', ['Field', 'Details']);
      if (current.columns.length !== 2) current = ensureSection(current.title, ['Field', 'Details']);
      current.rows.push(['Details', cleanMarkdown(rawLine)]);
      index += 1;
    }

    return sections.filter((section) => section.rows.length);
  };

  const getTableSections = (payload) => {
    if (payload === null || payload === undefined) {
      return [{ title: 'Review Output', columns: ['Result'], rows: [['No review data returned.']] }];
    }

    let source = payload;
    if (typeof source === 'string') {
      try {
        source = JSON.parse(source);
      } catch (error) {
        return parseMarkdownReview(source);
      }
    }

    if (source && typeof source === 'object' && typeof source.final === 'string' && source.final.includes('|')) {
      return parseMarkdownReview(source.final);
    }

    if (Array.isArray(source)) {
      if (!source.length) return [];

      if (typeof source[0] === 'object' && source[0] !== null) {
        if (source.length === 1 && Object.keys(source[0]).some((key) => isOverallScoreKey(key) || isFinalKey(key))) {
          source = source[0];
        } else {
          const columns = Object.keys(source[0]);
          return [{ title: 'Review Findings', columns, rows: source.map((item) => columns.map((key) => formatReviewValue(item[key]))) }];
        }
      }
      if (Array.isArray(source)) return [{ title: 'Review Output', columns: ['Entry'], rows: source.map((item) => [formatReviewValue(item)]) }];
    }

    if (typeof source !== 'object') {
      return [{ title: 'Review Output', columns: ['Result'], rows: [[formatReviewValue(source)]] }];
    }

    const sections = [];
    const firstLevelEntries = Object.entries(source);

    const scalarEntries = firstLevelEntries.filter(([, value]) => !Array.isArray(value) && (value === null || value === undefined || typeof value !== 'object'));
    if (scalarEntries.length) {
      const priorityEntries = scalarEntries.filter(([key]) => isOverallScoreKey(key) || isFinalKey(key));
      const remainingEntries = scalarEntries.filter(([key]) => !isOverallScoreKey(key) && !isFinalKey(key));
      sections.push({
        title: 'Summary',
        columns: ['Field', 'Value'],
        rows: [...priorityEntries, ...remainingEntries].map(([key, value]) => [
          isOverallScoreKey(key) ? 'Overall Score' : humanizeKey(key),
          formatSummaryValue(key, value)
        ])
      });
    }

    const arrayEntries = firstLevelEntries.filter(([, value]) => Array.isArray(value));
    arrayEntries.forEach(([key, value]) => {
      if (!value.length) return;
      if (typeof value[0] === 'object' && value[0] !== null) {
        const columns = Object.keys(value[0]);
        sections.push({
          title: humanizeKey(key),
          columns,
          rows: value.map((item) => columns.map((column) => formatReviewValue(item[column])))
        });
        return;
      }

      sections.push({
        title: humanizeKey(key),
        columns: ['Value'],
        rows: value.map((item) => [formatReviewValue(item)])
      });
    });

    const nestedEntries = firstLevelEntries.filter(([, value]) => value && typeof value === 'object' && !Array.isArray(value));
    nestedEntries.forEach(([key, value]) => {
      if (scalarEntries.some(([scalarKey]) => scalarKey === key)) return;
      const nestedRows = Object.entries(value).map(([nestedKey, nestedValue]) => [humanizeKey(nestedKey), formatReviewValue(nestedValue)]);
      if (nestedRows.length) {
        sections.push({
          title: humanizeKey(key),
          columns: ['Field', 'Value'],
          rows: nestedRows
        });
      }
    });

    if (!sections.length) {
      sections.push({
        title: 'Review Output',
        columns: ['Field', 'Value'],
        rows: firstLevelEntries.map(([key, value]) => [humanizeKey(key), formatReviewValue(value)])
      });
    }

    return sections;
  };

  const renderReviewResult = (payload) => {
    if (!resultBody) return;

    const sections = getTableSections(payload);

    resultBody.innerHTML = sections.map((section) => {
      const colgroup = section.columns.map((_, index) => {
        const width = section.columns.length === 3
          ? ['16%', '68%', '16%'][index]
          : section.columns.length === 2
            ? ['24%', '76%'][index]
          : index === 0 && section.columns.length > 1 ? '28%' : index === section.columns.length - 1 ? '48%' : '24%';
        return `<col style="width:${width}">`;
      }).join('');

      const header = section.columns.map((column) => `<th>${escapeHtml(humanizeKey(column))}</th>`).join('');
      const rows = section.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(formatReviewValue(cell))}</td>`).join('')}</tr>`).join('');

      return `
        <div class="ups-result-section">
          <h4>${escapeHtml(section.title)}</h4>
          <table class="ups-result-table">
            <colgroup>${colgroup}</colgroup>
            <thead><tr>${header}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }).join('');
  };

  const showInlineMessage = (message, isError = true) => {
    if (!inlineMessage) return;
    inlineMessage.textContent = message;
    inlineMessage.style.color = isError ? '#ffb0b0' : '#9fe5bf';
  };

  const clearInlineMessage = () => {
    if (!inlineMessage) return;
    inlineMessage.textContent = '';
  };

  const shakeWorkspace = () => {
    if (!workspacePanel) return;
    workspacePanel.classList.remove('is-shaking');
    void workspacePanel.offsetWidth;
    workspacePanel.classList.add('is-shaking');
    window.setTimeout(() => workspacePanel.classList.remove('is-shaking'), 420);
  };

  const setErrorState = (message) => {
    if (urlInput) urlInput.setAttribute('aria-invalid', 'true');
    if (urlWrap) urlWrap.classList.add('is-error');
    showInlineMessage(message, true);
    shakeWorkspace();
  };

  const clearErrorState = () => {
    if (urlInput) urlInput.setAttribute('aria-invalid', 'false');
    if (urlWrap) urlWrap.classList.remove('is-error');
    clearInlineMessage();
  };

  const setReviewVisibility = (state) => {
    if (reviewStage) reviewStage.classList.toggle('is-result', state === 'result');
    if (waitState) waitState.hidden = state !== 'waiting';
    if (loadingState) loadingState.hidden = state !== 'loading';
    if (resultPanel) resultPanel.hidden = state !== 'result';

    if (state === 'result') {
      if (waitState) waitState.style.display = 'none';
      if (loadingState) loadingState.style.display = 'none';
      if (resultPanel) resultPanel.style.display = 'flex';
    } else {
      if (waitState) waitState.style.display = '';
      if (loadingState) loadingState.style.display = '';
      if (resultPanel) resultPanel.style.display = 'none';
    }
  };

  const setLoading = (isLoading) => {
    if (!reviewButton || !urlInput) return;
    reviewButton.disabled = isLoading;
    reviewButton.classList.toggle('is-loading', isLoading);
    urlInput.disabled = isLoading;
    reviewButton.textContent = isLoading ? 'Analyzing Code...' : 'Review Code';
    if (isLoading) {
      setReviewVisibility('loading');
    } else if (resultPanel && !resultPanel.hidden) {
      setReviewVisibility('result');
    } else {
      setReviewVisibility('waiting');
    }
  };

  const setModal = (isOpen) => {
    if (!reviewModal) return;
    reviewModal.classList.toggle('open', isOpen);
    reviewModal.setAttribute('aria-hidden', String(!isOpen));
  };

  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  if (document.querySelector('#newReviewButton')) {
    document.querySelector('#newReviewButton').addEventListener('click', () => setModal(true));
  }

  if (document.querySelector('#modalClose')) {
    document.querySelector('#modalClose').addEventListener('click', () => setModal(false));
  }

  if (reviewModal) {
    reviewModal.addEventListener('click', (event) => {
      if (event.target === reviewModal) setModal(false);
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setModal(false);
  });

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      navItems.forEach((navItem) => navItem.classList.remove('active'));
      item.classList.add('active');
      breadcrumbCurrent.textContent = item.dataset.view;
      sidebar.classList.remove('open');
    });
  });

  queueTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      queueTabs.forEach((queueTab) => queueTab.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.dataset.filter;
      reviewRows.forEach((row) => {
        row.hidden = filter !== 'all' && row.dataset.severity !== filter;
      });
    });
  });

  document.querySelector('#startReview')?.addEventListener('click', () => {
    setModal(false);
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 3500);
  });

  document.querySelector('#viewQueueButton')?.addEventListener('click', () => {
    document.querySelector('.review-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  reviewButton?.addEventListener('click', async () => {
    const urlValue = (urlInput?.value || '').trim();

    if (!urlValue) {
      setErrorState('Please enter a GitHub file URL before starting the review.');
      return;
    }

    clearErrorState();
    if (resultPanel) resultPanel.hidden = true;
    setLoading(true);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: urlValue })
      });

      const responseText = await response.text();
      let parsedPayload = responseText;

      if (responseText) {
        try {
          parsedPayload = JSON.parse(responseText);
        } catch (error) {
          parsedPayload = responseText;
        }
      }

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      showInlineMessage('Review payload sent successfully.', false);
      updateSummaryMetrics(parsedPayload);
      renderReviewResult(parsedPayload);
      setReviewVisibility('result');
    } catch (error) {
      setErrorState('Unable to reach the n8n webhook at http://localhost:5678/webhook/Code_Review. Please verify that the server is running.');
      setReviewVisibility('waiting');
    } finally {
      setLoading(false);
    }
  });
});