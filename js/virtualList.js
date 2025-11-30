const RAF =
  typeof window !== "undefined" && window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : (fn) => setTimeout(fn, 16);

function createSpacerElement(tagName = "div") {
  const el = document.createElement(tagName);
  el.className = "virtual-spacer";
  el.style.height = "0px";
  return el;
}

function coerceList(list) {
  return Array.isArray(list) ? list.slice() : [];
}

export function createVirtualList({
  container,
  scrollContainer = container,
  renderItem,
  estimatedItemHeight = 56,
  overscan = 4,
}) {
  if (!container) return null;
  const beforeSpacer = createSpacerElement("div");
  const itemsHost = document.createElement("div");
  itemsHost.className = "virtual-items";
  const afterSpacer = createSpacerElement("div");
  container.innerHTML = "";
  container.append(beforeSpacer, itemsHost, afterSpacer);

  let items = [];
  let emptyRenderer = null;
  let averageHeight = estimatedItemHeight;
  let mounted = true;

  function setEmptyRenderer(renderer) {
    emptyRenderer = typeof renderer === "function" ? renderer : null;
    if (!items.length) {
      render(true);
    }
  }

  function measureAndAdjust(startIndex, visibleCount) {
    if (!visibleCount) return;
    RAF(() => {
      if (!mounted) return;
      const children = Array.from(itemsHost.children);
      if (!children.length) return;
      const totalHeight = children.reduce((sum, node) => sum + node.getBoundingClientRect().height, 0);
      if (totalHeight <= 0) return;
      const actualAverage = totalHeight / visibleCount;
      if (Number.isFinite(actualAverage) && actualAverage > 0) {
        averageHeight = Math.max(24, (averageHeight + actualAverage) / 2);
        beforeSpacer.style.height = `${Math.max(0, startIndex * averageHeight)}px`;
        afterSpacer.style.height = `${Math.max(0, (items.length - (startIndex + visibleCount)) * averageHeight)}px`;
      }
    });
  }

  function render(forceEmpty = false) {
    if (!mounted) return;
    if (!items.length || forceEmpty) {
      itemsHost.innerHTML = "";
      beforeSpacer.style.height = "0px";
      afterSpacer.style.height = "0px";
      if (emptyRenderer) {
        const emptyNode = emptyRenderer();
        if (emptyNode) {
          itemsHost.appendChild(emptyNode);
        }
      }
      return;
    }
    const viewportHeight = scrollContainer?.clientHeight || averageHeight * 4;
    const scrollTop = scrollContainer?.scrollTop || 0;
    const baseHeight = Math.max(averageHeight, 24);
    const startIndex = Math.max(0, Math.floor(scrollTop / baseHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + viewportHeight) / baseHeight) + overscan,
    );
    const visibleCount = Math.max(0, endIndex - startIndex);
    itemsHost.innerHTML = "";
    const fragment = document.createDocumentFragment();
    for (let i = startIndex; i < endIndex; i += 1) {
      const node = renderItem(items[i], i);
      if (node) fragment.appendChild(node);
    }
    itemsHost.appendChild(fragment);
    beforeSpacer.style.height = `${Math.max(0, startIndex * baseHeight)}px`;
    afterSpacer.style.height = `${Math.max(0, (items.length - endIndex) * baseHeight)}px`;
    measureAndAdjust(startIndex, visibleCount);
  }

  const handleScroll = () => render();
  const handleResize = () => render();
  scrollContainer?.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", handleResize);

  return {
    setItems(list = []) {
      items = coerceList(list);
      render();
    },
    refresh() {
      render();
    },
    setEmptyRenderer,
    scrollToEnd() {
      if (!scrollContainer) return;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
      render();
    },
    destroy() {
      mounted = false;
      scrollContainer?.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      container.innerHTML = "";
    },
  };
}

function createSpacerRow(columnCount) {
  const row = document.createElement("tr");
  row.className = "virtual-spacer-row";
  const cell = document.createElement("td");
  cell.colSpan = columnCount;
  cell.style.padding = "0";
  cell.style.border = "none";
  const spacerBlock = document.createElement("div");
  spacerBlock.className = "virtual-table-spacer";
  cell.appendChild(spacerBlock);
  row.appendChild(cell);

  const setHeight = value => {
    const safe = Math.max(0, value);
    const px = `${safe}px`;
    row.style.height = px;
    spacerBlock.style.height = px;
  };
  setHeight(0);

  return { row, block: spacerBlock, setHeight };
}

export function createVirtualTableVirtualizer({
  tbody,
  scrollContainer,
  columnCount = 1,
  estimatedItemHeight = 72,
  overscan = 2,
}) {
  if (!tbody) return null;
  const container = scrollContainer || tbody.parentElement;
  const beforeSpacer = createSpacerRow(columnCount);
  const afterSpacer = createSpacerRow(columnCount);

  let items = [];
  let renderer = null;
  let emptyRenderer = null;
  let averageHeight = estimatedItemHeight;
  let mounted = true;
  let lastRenderInfo = null;

  function setEmptyRenderer(fn) {
    emptyRenderer = typeof fn === "function" ? fn : null;
    if (!items.length) render(true);
  }

  function measureAndAdjust(startIndex, visibleCount, renderedNodes) {
    if (!visibleCount || !renderedNodes.length) return;
    RAF(() => {
      if (!mounted) return;
      const total = renderedNodes.reduce((sum, node) => sum + node.getBoundingClientRect().height, 0);
      if (total <= 0) return;
      const actual = total / visibleCount;
      if (Number.isFinite(actual) && actual > 0) {
        averageHeight = Math.max(40, (averageHeight + actual) / 2);
        beforeSpacer.setHeight(startIndex * averageHeight);
        afterSpacer.setHeight((items.length - (startIndex + visibleCount)) * averageHeight);
      }
    });
  }

  function render(forceEmpty = false) {
    if (!mounted) return;
    tbody.innerHTML = "";
    if (!items.length || !renderer || forceEmpty) {
      if (emptyRenderer) {
        const emptyRow = emptyRenderer();
        if (emptyRow) tbody.appendChild(emptyRow);
      } else {
        tbody.appendChild(beforeSpacer.row);
        tbody.appendChild(afterSpacer.row);
      }
      beforeSpacer.setHeight(0);
      afterSpacer.setHeight(0);
      lastRenderInfo = null;
      return;
    }
    const viewportHeight = container?.clientHeight || averageHeight * 4;
    const scrollTop = container?.scrollTop || 0;
    const baseHeight = Math.max(averageHeight, 32);
    const startIndex = Math.max(0, Math.floor(scrollTop / baseHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + viewportHeight) / baseHeight) + overscan,
    );
    const visibleCount = Math.max(0, endIndex - startIndex);
    const fragment = document.createDocumentFragment();
    const renderedNodes = [];
    fragment.appendChild(beforeSpacer.row);
    for (let i = startIndex; i < endIndex; i += 1) {
      const rowNodes = renderer(items[i], i);
      if (Array.isArray(rowNodes)) {
        rowNodes.forEach(node => {
          if (node) {
            fragment.appendChild(node);
            renderedNodes.push(node);
          }
        });
      } else if (rowNodes) {
        fragment.appendChild(rowNodes);
        renderedNodes.push(rowNodes);
      }
    }
    fragment.appendChild(afterSpacer.row);
    tbody.appendChild(fragment);

    beforeSpacer.setHeight(startIndex * baseHeight);
    afterSpacer.setHeight((items.length - endIndex) * baseHeight);
    measureAndAdjust(startIndex, visibleCount, renderedNodes);
    lastRenderInfo = {
      startIndex,
      visibleCount,
      renderedNodes: renderedNodes.slice(),
    };
  }

  const handleScroll = () => render();
  container?.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", handleScroll);

  return {
    setItems(list = [], renderFn) {
      if (renderFn) renderer = renderFn;
      items = coerceList(list);
      render();
    },
    refresh() {
      render();
    },
    setEmptyRenderer,
    measureVisibleRows() {
      if (!lastRenderInfo) return;
      measureAndAdjust(
        lastRenderInfo.startIndex,
        lastRenderInfo.visibleCount,
        lastRenderInfo.renderedNodes,
      );
    },
    destroy() {
      mounted = false;
      container?.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (tbody) tbody.innerHTML = "";
      lastRenderInfo = null;
    },
  };
}
