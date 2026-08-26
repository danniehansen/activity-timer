<template>
  <div class="limita-announcement">
    <!-- Video Section -->
    <div class="video-section">
      <div class="video-wrapper">
        <!-- prettier-ignore -->
        <iframe
          src="https://www.youtube.com/embed/286wNFlJCpk"
          title="Introducing Limita - The paid successor to Activity Timer"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
    </div>

    <!-- Content Section -->
    <div class="content-section">
      <h2 class="announcement-title">Introducing Limita</h2>

      <p class="intro-text">
        I've developed Activity Timer for the past 5+ years in my off hours,
        keeping it free and open for everyone. Due to recent changes in my life,
        I'm now on my own and looking to build my own products.
        <strong>Limita</strong> is the result of that.
      </p>

      <div class="info-card">
        <h3>What does this mean for Activity Timer?</h3>
        <ul>
          <li>
            <strong>Activity Timer isn't going anywhere.</strong> It will
            continue to be free and open-source.
          </li>
          <li>
            Activity Timer is entering <strong>maintenance mode</strong>. This
            update is most likely the last update you'll see. Only security
            patches will be released going forward.
          </li>
          <li>
            Activity Timer is incredibly stable and there hasn't been any need
            for active development for quite a while.
          </li>
        </ul>
      </div>

      <div class="info-card highlight">
        <h3>Why Limita?</h3>
        <p>
          Limita offers everything Activity Timer has, plus features I was never
          quite able to achieve here:
        </p>
        <ul>
          <li>
            <strong>Billable hours tracking</strong> with client management
          </li>
          <li>
            <strong>Custom fields</strong> to categorize your time however you
            need
          </li>
          <li>
            <strong>Revenue dashboards</strong> so you can see how your time
            translates to money
          </li>
          <li>
            <strong>Multiple auto-start lists</strong> for more complex
            workflows
          </li>
          <li>
            <strong>Built-in migration</strong> so you can bring your Activity
            Timer data with you
          </li>
        </ul>
      </div>

      <div class="pricing-info">
        <h3>Pricing</h3>
        <p>
          <strong>$10/month per workspace</strong> with unlimited users and
          unlimited boards. The price doesn't scale with your usage because the
          infrastructure side doesn't take much to host. The actual cost comes
          from support and maintenance of the product.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <Button
          label="Visit Limita Website"
          icon="pi pi-external-link"
          class="p-button-primary"
          @click="openLimitaWebsite"
        />
        <Button
          label="View Pricing"
          icon="pi pi-dollar"
          severity="secondary"
          outlined
          @click="openPricing"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getLimitaUrl } from '../utils/limita-links';

const openLimitaWebsite = () => {
  window.open(
    getLimitaUrl('/', 'announcement-visit-site'),
    '_blank',
    'noopener,noreferrer'
  );
};

const openPricing = () => {
  window.open(
    getLimitaUrl('/pricing/', 'announcement-pricing'),
    '_blank',
    'noopener,noreferrer'
  );
};
</script>

<style scoped>
.limita-announcement {
  max-width: 800px;
  margin: 0 auto;
  padding: 1.5rem;
}

.video-section {
  margin-bottom: 1.5rem;
}

.video-wrapper {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.video-wrapper iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 8px;
}

.content-section {
  color: #172b4d;
}

html[data-color-mode='dark'] .content-section {
  color: #b6c2cf;
}

.announcement-title {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #172b4d;
}

html[data-color-mode='dark'] .announcement-title {
  color: #e2e8f0;
}

.intro-text {
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.info-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
}

html[data-color-mode='dark'] .info-card {
  background: #2d3748;
  border-color: #4a5568;
}

.info-card.highlight {
  background: #e8f4fd;
  border-color: #b8daff;
}

html[data-color-mode='dark'] .info-card.highlight {
  background: #1a365d;
  border-color: #2b6cb0;
}

.info-card h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #172b4d;
}

html[data-color-mode='dark'] .info-card h3 {
  color: #e2e8f0;
}

.info-card p {
  margin: 0 0 0.5rem 0;
  line-height: 1.5;
}

.info-card ul {
  margin: 0;
  padding-left: 1.25rem;
}

.info-card li {
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.info-card li:last-child {
  margin-bottom: 0;
}

.pricing-info {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
}

.pricing-info h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: white;
}

.pricing-info p {
  margin: 0;
  line-height: 1.5;
  opacity: 0.95;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}
</style>
