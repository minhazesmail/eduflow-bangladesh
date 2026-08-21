import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'a','abbr','b','blockquote','br','code','del','div','em','h2','h3','h4','hr',
  'i','li','ol','p','pre','q','s','small','span','strong','sub','sup','u','ul'
];
const ALLOWED_ATTR = ['class','href','target','rel','title','aria-label'];

const sanitize = (dirty) => DOMPurify.sanitize(String(dirty ?? ''), {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['style','script','iframe','object','embed','form','input','textarea','button'],
  FORBID_ATTR: ['style','onerror','onclick','onload','onmouseover','onfocus','srcdoc']
});

export { sanitize };
export const securitySanitize = Object.freeze({ html: sanitize });

if (typeof window !== 'undefined') {
  window.EduFlowSecurity = Object.freeze({
    ...(window.EduFlowSecurity || {}),
    sanitizeHtml: sanitize
  });
}
