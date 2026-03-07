"use client";

import { useEffect } from "react";

/**
 * Google Translate modifies the DOM by replacing text nodes with <font> tags.
 * When React tries to update or unmount a component containing translated text, 
 * it attempts to remove the original text node. Since Google Translate has replaced it, 
 * React throws a "NotFoundError: Failed to execute 'removeChild' on 'Node'".
 * 
 * This component safely patches Node.prototype methods to catch and ignore these errors,
 * preventing the entire Next.js application from crashing.
 */
export default function GoogleTranslateFix() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof Node === "undefined") return;

    const originalRemoveChild = Node.prototype.removeChild;
    const originalInsertBefore = Node.prototype.insertBefore;

    Node.prototype.removeChild = function (child) {
      if (child.parentNode !== this) {
        console.warn("Google Translate React Fix: Ignored removeChild on a different parent.");
        return child;
      }
      return originalRemoveChild.apply(this, arguments);
    };

    Node.prototype.insertBefore = function (newNode, referenceNode) {
      if (referenceNode && referenceNode.parentNode !== this) {
        console.warn("Google Translate React Fix: Ignored insertBefore on a different parent.");
        return newNode;
      }
      return originalInsertBefore.apply(this, arguments);
    };

    return () => {
      Node.prototype.removeChild = originalRemoveChild;
      Node.prototype.insertBefore = originalInsertBefore;
    };
  }, []);

  return null;
}
